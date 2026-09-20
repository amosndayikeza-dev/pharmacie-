<?php

namespace App\Services;

use App\Models\Lot;
use App\Models\LigneVente;
use App\Models\Medicament;
use App\Models\MouvementStock;
use App\Models\Vente;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Service métier des ventes.
 *
 * 🎯 CŒUR DU PROJET : applique le FEFO (First Expired, First Out),
 *    décrémente les lots, crée les lignes de vente (coût figé),
 *    enregistre les mouvements de stock — le tout en TRANSACTION.
 *
 * ⚠️ INSERT-ONLY : une vente ne se modifie pas, ne se supprime pas.
 *    Pour corriger, on crée un AVOIR (autre vente avec statut = 'avoir').
 */
class VenteService
{
    /**
     * Enregistre une vente complète.
     */
    public function enregistrer(array $data, int $utilisateurId): Vente
    {
        return DB::transaction(function () use ($data, $utilisateurId) {

            // 1. Créer l'en-tête de vente (totaux provisoires à 0)
            $vente = Vente::create([
                'numero_ticket'      => $this->genererNumeroTicket(),
                'proprietaire_id'    => $data['proprietaire_id'] ?? null,
                'animal_id'          => $data['animal_id'] ?? null,
                'utilisateur_id'     => $utilisateurId,
                'ordonnance_id'      => $data['ordonnance_id'] ?? null,
                'date_heure'         => now(),
                'montant_total_ht'   => 0,
                'montant_total_tva'  => 0,
                'montant_total_ttc'  => 0,
                'montant_remise'     => $data['montant_remise'] ?? 0,
                'statut'             => 'validee',
            ]);

            // 2. Traiter chaque ligne (FEFO)
            $totaux = ['ht' => 0, 'tva' => 0, 'ttc' => 0, 'marge' => 0];

            foreach ($data['lignes'] as $ligneData) {
                $sousTotaux = $this->traiterLigne(
                    $vente,
                    (int) $ligneData['medicament_id'],
                    (int) $ligneData['quantite']
                );

                $totaux['ht']    += $sousTotaux['ht'];
                $totaux['tva']   += $sousTotaux['tva'];
                $totaux['ttc']   += $sousTotaux['ttc'];
                $totaux['marge'] += $sousTotaux['marge'];
            }

            // 3. Appliquer la remise sur le TTC
            $remise = (float) ($data['montant_remise'] ?? 0);
            $totaux['ttc'] = max(0, $totaux['ttc'] - $remise);

            // 4. Mettre à jour les totaux de la vente
            $vente->montant_total_ht  = $totaux['ht'];
            $vente->montant_total_tva = $totaux['tva'];
            $vente->montant_total_ttc = $totaux['ttc'];
            $vente->save();

            return $vente;
        });
    }

    /**
     * Traite une ligne : applique le FEFO, décrémente les lots,
     * crée les ligne_ventes et les mouvements de stock.
     *
     * @return array{ht: float, tva: float, ttc: float, marge: float}
     */
    private function traiterLigne(Vente $vente, int $medicamentId, int $quantiteDemandee): array
    {
        $medicament = Medicament::findOrFail($medicamentId);

        $prixVenteTtcUnitaire = (float) $medicament->prix_vente_ttc_reference;
        $tauxTva              = (float) ($medicament->taux_tva ?? 0);

        // 1. Récupérer les lots disponibles (FEFO)
        $lots = Lot::query()
            ->where('medicament_id', $medicamentId)
            ->where('quantite_restante', '>', 0)
            ->where('date_peremption', '>=', now())
            ->orderBy('date_peremption', 'asc')
            ->lockForUpdate()  // 🔒 évite les race conditions
            ->get();

        // 2. Vérifier le stock total disponible
        $stockTotal = $lots->sum('quantite_restante');

        if ($stockTotal < $quantiteDemandee) {
            throw ValidationException::withMessages([
                'lignes' => [
                    "Stock insuffisant pour le médicament « {$medicament->nom} ». " .
                    "Disponible : {$stockTotal}, demandé : {$quantiteDemandee}."
                ],
            ]);
        }

        // 3. Décrémenter les lots en FEFO et créer les ligne_ventes
        $restant = $quantiteDemandee;
        $totaux = ['ht' => 0, 'tva' => 0, 'ttc' => 0, 'marge' => 0];

        foreach ($lots as $lot) {
            if ($restant <= 0) {
                break;
            }

            $quantitePrise = min($restant, $lot->quantite_restante);

            // Calculs financiers
            $prixAchatHtFige = (float) $lot->prix_achat_ht_unitaire;

            // Le prix de vente TTC → on en déduit le HT
            $prixVenteHtUnitaire  = $prixVenteTtcUnitaire / (1 + ($tauxTva / 100));
            $prixVenteTvaUnitaire = $prixVenteTtcUnitaire - $prixVenteHtUnitaire;

            $montantHt  = round($prixVenteHtUnitaire * $quantitePrise, 2);
            $montantTva = round($prixVenteTvaUnitaire * $quantitePrise, 2);
            $montantTtc = round($prixVenteTtcUnitaire * $quantitePrise, 2);
            $margeBrute = round($montantHt - ($prixAchatHtFige * $quantitePrise), 2);

            // Créer la ligne de vente (coût figé)
            LigneVente::create([
                'vente_id'                    => $vente->id,
                'lot_id'                      => $lot->id,
                'medicament_id'               => $medicamentId,
                'quantite'                    => $quantitePrise,
                'prix_vente_ttc_unitaire'     => $prixVenteTtcUnitaire,
                'prix_achat_ht_unitaire_fige' => $prixAchatHtFige,
                'taux_tva'                    => $tauxTva,
                'montant_ht'                  => $montantHt,
                'montant_tva'                 => $montantTva,
                'montant_ttc'                 => $montantTtc,
                'marge_brute'                 => $margeBrute,
            ]);

            // Décrémenter le lot
            $lot->quantite_restante -= $quantitePrise;
            $lot->save();

            // Enregistrer le mouvement de stock (sortie)
            MouvementStock::create([
                'lot_id'         => $lot->id,
                'date_heure'     => now(),
                'quantite'       => -$quantitePrise,           // négatif = sortie
                'type'           => 'vente',
                'reference_id'   => $vente->id,
                'reference_type' => Vente::class,              // ← AJOUT
                'utilisateur_id' => $vente->utilisateur_id,    // ← AJOUT
                'motif'          => "Vente {$vente->numero_ticket}",  // ← AJOUT
            ]);

            // Cumul
            $totaux['ht']    += $montantHt;
            $totaux['tva']   += $montantTva;
            $totaux['ttc']   += $montantTtc;
            $totaux['marge'] += $margeBrute;

            $restant -= $quantitePrise;
        }

        return $totaux;
    }

    /**
     * Génère un numéro de ticket unique : TKT-2025-0001
     */
    private function genererNumeroTicket(): string
    {
        $annee   = now()->year;
        $prefixe = "TKT-{$annee}-";

        $dernier = Vente::where('numero_ticket', 'like', "{$prefixe}%")
            ->orderBy('numero_ticket', 'desc')
            ->first();

        $numero = $dernier ? ((int) substr($dernier->numero_ticket, -4) + 1) : 1;

        return $prefixe . str_pad($numero, 4, '0', STR_PAD_LEFT);
    }
}