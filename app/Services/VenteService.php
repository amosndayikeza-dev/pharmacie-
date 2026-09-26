<?php

namespace App\Services;

use App\Models\Lot;
use App\Models\LigneVente;
use App\Models\Medicament;
use App\Models\MouvementStock;
use App\Models\Paiement;
use App\Models\Vente;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * ============================================================
 * SERVICE MÉTIER DES VENTES
 * ============================================================
 *
 * 🎯 CŒUR DU PROJET : applique le FEFO (First Expired, First Out),
 *    décrémente les lots, crée les lignes de vente (coût figé),
 *    enregistre les mouvements de stock — le tout en TRANSACTION.
 *
 * ⚠️ INSERT-ONLY : une vente ne se modifie pas, ne se supprime pas.
 *    Pour corriger, on crée un AVOIR (autre vente avec statut = 'avoir').
 *
 * RÈGLES DE GESTION DES PAIEMENTS :
 *   - Si montant payé = total → 1 seul paiement "especes" (pas de crédit)
 *   - Si montant payé < total → 1 paiement "especes" + 1 paiement "credit"
 *   - Si montant payé = 0 → 1 seul paiement "credit" (total)
 */
class VenteService
{
    /**
     * Enregistre une vente complète.
     *
     * @param array $data   Données validées (lignes, proprietaire_id, montant_paye...)
     * @param int   $userId Vendeur qui réalise la vente
     * @return Vente
     * @throws \Throwable
     */
    public function enregistrer(array $data, int $userId): Vente
    {
        return DB::transaction(function () use ($data, $userId) {

            // ═════════════════════════════════════════════════════
            // 1. Créer l'en-tête de la vente (montants à 0, calculés plus bas)
            // ═════════════════════════════════════════════════════
            $vente = Vente::create([
                'numero_ticket'    => $this->genererNumeroTicket(),
                'proprietaire_id'  => $data['proprietaire_id'] ?? null,
                'animal_id'        => $data['animal_id'] ?? null,
                'ordonnance_id'    => $data['ordonnance_id'] ?? null,
                'utilisateur_id'   => $userId,
                'date_heure'       => now(),
                'montant_total_ht' => 0,
                'montant_total_tva'=> 0,
                'montant_total_ttc'=> 0,
                'montant_remise'   => $data['montant_remise'] ?? 0,
                'statut'           => 'validee',
            ]);

            // ═════════════════════════════════════════════════════
            // 2. Traiter chaque ligne (FEFO + lignes + mouvements)
            // ═════════════════════════════════════════════════════
            $totalHt  = 0;
            $totalTva = 0;
            $totalTtc = 0;

            foreach ($data['lignes'] as $ligne) {
                $totauxLigne = $this->traiterLigne(
                    $vente,
                    (int) $ligne['medicament_id'],
                    (int) $ligne['quantite']
                );

                $totalHt  += $totauxLigne['ht'];
                $totalTva += $totauxLigne['tva'];
                $totalTtc += $totauxLigne['ttc'];
            }

            // Arrondir les totaux à 2 décimales (évite les erreurs flottantes)
            $totalHt  = round($totalHt, 2);
            $totalTva = round($totalTva, 2);
            $totalTtc = round($totalTtc, 2);

            // ═════════════════════════════════════════════════════
            // 3. Mettre à jour les totaux de la vente
            // ═════════════════════════════════════════════════════
            $vente->update([
                'montant_total_ht'  => $totalHt,
                'montant_total_tva' => $totalTva,
                'montant_total_ttc' => $totalTtc,
            ]);

                        // ═════════════════════════════════════════════════════
            // 4. Créer les paiements + déterminer le statut
            // ═════════════════════════════════════════════════════
            $montantPaye = (float) ($data['montant_paye'] ?? 0);
            $montantPaye = min($montantPaye, $totalTtc);
            $montantPaye = round($montantPaye, 2);

            $resteCredit = round($totalTtc - $montantPaye, 2);

            // Paiement espèces (uniquement si > 0)
            if ($montantPaye > 0.01) {
                Paiement::create([
                    'vente_id' => $vente->id,
                    'type'     => 'especes',
                    'montant'  => $montantPaye,
                ]);
            }

            // Paiement crédit (uniquement si reste > 0)
            if ($resteCredit > 0.01) {
                Paiement::create([
                    'vente_id' => $vente->id,
                    'type'     => 'credit',
                    'montant'  => $resteCredit,
                ]);
            }

            // ⚠️ Déterminer le statut de la vente selon le paiement
            $statut = match (true) {
                $resteCredit <= 0.01 => 'validee',    // payée 100%
                $montantPaye > 0.01  => 'partielle',  // payée partiellement
                default              => 'credit',     // rien payé
            };

            $vente->update([
                'montant_total_ht'  => $totalHt,
                'montant_total_tva' => $totalTva,
                'montant_total_ttc' => $totalTtc,
                'statut'            => $statut,
            ]);

            // ═════════════════════════════════════════════════════
            // 5. Journalisation RGPD
            // ═════════════════════════════════════════════════════
            LogService::log(
                'creation_vente',
                'ventes',
                $vente,
                null,
                [
                    'numero_ticket' => $vente->numero_ticket,
                    'montant_ttc'   => $totalTtc,
                    'montant_paye'  => $montantPaye,
                    'reste_credit'  => $resteCredit,
                ]
            );

            return $vente;
        });
    }

    /**
     * Traite une ligne de vente :
     *   - Applique le FEFO (First Expired, First Out)
     *   - Décrémente les lots
     *   - Crée les ligne_ventes (avec coût figé)
     *   - Enregistre les mouvements de stock
     *
     * @return array{ht: float, tva: float, ttc: float, marge: float}
     */
    private function traiterLigne(Vente $vente, int $medicamentId, int $quantiteDemandee): array
    {
        $medicament = Medicament::findOrFail($medicamentId);

        $prixVenteTtcUnitaire = (float) $medicament->prix_vente_ttc_reference;
        $tauxTva              = (float) ($medicament->taux_tva ?? 0);

        // ─── 1. Récupérer les lots disponibles (FEFO + LOCK) ───
        // ⚠️ lockForUpdate() empêche 2 ventes simultanées de prendre le même lot
        $lots = Lot::query()
            ->where('medicament_id', $medicamentId)
            ->where('quantite_restante', '>', 0)
            ->where('date_peremption', '>=', now())
            ->orderBy('date_peremption', 'asc')
            ->lockForUpdate()
            ->get();

        // ─── 2. Vérifier le stock total disponible ───
        $stockTotal = $lots->sum('quantite_restante');

        if ($stockTotal < $quantiteDemandee) {
            throw ValidationException::withMessages([
                'lignes' => [
                    "Stock insuffisant pour le médicament « {$medicament->nom} ». " .
                    "Disponible : {$stockTotal}, demandé : {$quantiteDemandee}."
                ],
            ]);
        }

        // ─── 3. Décrémenter les lots en FEFO ───
        $restant = $quantiteDemandee;
        $totaux  = ['ht' => 0, 'tva' => 0, 'ttc' => 0, 'marge' => 0];

        foreach ($lots as $lot) {
            if ($restant <= 0) break;

            $quantitePrise = min($restant, $lot->quantite_restante);

            // Calculs financiers (HT / TVA / TTC)
            $prixAchatHtFige      = (float) $lot->prix_achat_ht_unitaire;
            $prixVenteHtUnitaire  = $prixVenteTtcUnitaire / (1 + ($tauxTva / 100));
            $prixVenteTvaUnitaire = $prixVenteTtcUnitaire - $prixVenteHtUnitaire;

            $montantHt  = round($prixVenteHtUnitaire  * $quantitePrise, 2);
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

            // Décrémenter le lot (FEFO)
            $lot->quantite_restante -= $quantitePrise;
            $lot->save();

            // Enregistrer le mouvement de stock (sortie)
            MouvementStock::create([
                'lot_id'         => $lot->id,
                'date_heure'     => now(),
                'quantite'       => -$quantitePrise,       // négatif = sortie
                'type'           => 'vente',
                'reference_id'   => $vente->id,
                'reference_type' => Vente::class,
                'utilisateur_id' => $vente->utilisateur_id,
                'motif'          => "Vente {$vente->numero_ticket}",
            ]);

            // Cumul des totaux
            $totaux['ht']    += $montantHt;
            $totaux['tva']   += $montantTva;
            $totaux['ttc']   += $montantTtc;
            $totaux['marge'] += $margeBrute;

            $restant -= $quantitePrise;
        }

        return $totaux;
    }

    /**
     * Génère un numéro de ticket unique : TKT-2026-0001
     */
    private function genererNumeroTicket(): string
    {
        $annee   = now()->year;
        $prefixe = "TKT-{$annee}-";

        $dernier = Vente::where('numero_ticket', 'like', "{$prefixe}%")
            ->orderBy('numero_ticket', 'desc')
            ->first();

        $numero = $dernier
            ? ((int) substr($dernier->numero_ticket, -4) + 1)
            : 1;

        return $prefixe . str_pad($numero, 4, '0', STR_PAD_LEFT);
    }
}