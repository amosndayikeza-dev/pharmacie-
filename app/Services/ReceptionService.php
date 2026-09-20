<?php

namespace App\Services;

use App\Models\Achat;
use App\Models\LigneAchat;
use App\Models\LigneReception;
use App\Models\Lot;
use App\Models\MouvementStock;
use App\Models\Reception;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Service métier des réceptions.
 */
class ReceptionService
{
    public function creer(array $data, int $utilisateurId): Reception
    {
        return DB::transaction(function () use ($data, $utilisateurId) {

            $totaux = $this->calculerTotaux($data['lignes']);

            $reception = Reception::create([
                'numero_reception'     => $this->genererNumeroReception(),
                'achat_id'             => $data['achat_id'] ?? null,
                'fournisseur_id'       => $data['fournisseur_id'],
                'utilisateur_id'       => $utilisateurId,
                'date_reception'       => $data['date_reception'],
                'numero_bon_livraison' => $data['numero_bon_livraison'] ?? null,
                'montant_total_ht'     => $totaux['ht'],
                'montant_total_tva'    => $totaux['tva'],
                'montant_total_ttc'    => $totaux['ttc'],
                'statut'               => 'brouillon',
                'observations'         => $data['observations'] ?? null,
            ]);

            $this->creerLignes($reception, $data['lignes']);

            // Journalisation
            LogService::log(
                action: 'creation_reception',
                module: 'receptions',
                entite: $reception,
                donneesApres: [
                    'numero_reception' => $reception->numero_reception,
                    'montant_ttc'      => $reception->montant_total_ttc,
                ],
            );

            return $reception;
        });
    }

    public function modifier(Reception $reception, array $data): Reception
    {
        if ($reception->statut !== 'brouillon') {
            throw ValidationException::withMessages([
                'statut' => ['Impossible de modifier une réception qui n\'est plus en brouillon.'],
            ]);
        }

        return DB::transaction(function () use ($reception, $data) {

            $avant = $reception->toArray();

            if (isset($data['date_reception'])) {
                $reception->date_reception = $data['date_reception'];
            }
            if (isset($data['numero_bon_livraison'])) {
                $reception->numero_bon_livraison = $data['numero_bon_livraison'];
            }
            if (isset($data['observations'])) {
                $reception->observations = $data['observations'];
            }

            if (isset($data['lignes'])) {
                $reception->lignes()->delete();

                $totaux = $this->calculerTotaux($data['lignes']);

                $reception->montant_total_ht  = $totaux['ht'];
                $reception->montant_total_tva = $totaux['tva'];
                $reception->montant_total_ttc = $totaux['ttc'];

                $this->creerLignes($reception, $data['lignes']);
            }

            $reception->save();

            // Journalisation
            LogService::log(
                action: 'modification_reception',
                module: 'receptions',
                entite: $reception,
                donneesAvant: $avant,
                donneesApres: $reception->fresh()->toArray(),
            );

            return $reception;
        });
    }

    public function valider(Reception $reception): Reception
    {
        if ($reception->statut !== 'brouillon') {
            throw ValidationException::withMessages([
                'statut' => ['Cette réception a déjà été traitée.'],
            ]);
        }

        if ($reception->lignes()->count() === 0) {
            throw ValidationException::withMessages([
                'lignes' => ['Impossible de valider une réception sans lignes.'],
            ]);
        }

        return DB::transaction(function () use ($reception) {

            foreach ($reception->lignes as $ligne) {
                $lot = Lot::create([
                    'medicament_id'          => $ligne->medicament_id,
                    'fournisseur_id'         => $reception->fournisseur_id,
                    'numero_lot'             => $ligne->numero_lot,
                    'date_peremption'        => $ligne->date_peremption,
                    'date_fabrication'       => $ligne->date_fabrication,
                    'prix_achat_ht_unitaire' => $ligne->prix_achat_ht_unitaire,
                    'quantite_initiale'      => $ligne->quantite_recue,
                    'quantite_restante'      => $ligne->quantite_recue,
                ]);

                MouvementStock::create([
                    'lot_id'         => $lot->id,
                    'date_heure'     => now(),
                    'quantite'       => $ligne->quantite_recue,
                    'type'           => 'achat',
                    'reference_id'   => $reception->id,
                    'reference_type' => Reception::class,
                    'utilisateur_id' => $reception->utilisateur_id,
                    'motif'          => "Réception {$reception->numero_reception}",
                ]);

                if ($ligne->ligne_achat_id) {
                    $ligneAchat = LigneAchat::find($ligne->ligne_achat_id);
                    if ($ligneAchat) {
                        $ligneAchat->quantite_recue += $ligne->quantite_recue;
                        $ligneAchat->save();
                    }
                }
            }

            if ($reception->achat_id) {
                $this->majStatutAchat(Achat::find($reception->achat_id));
            }

            $reception->statut = 'validee';
            $reception->save();

            // Journalisation
            LogService::log(
                action: 'validation_reception',
                module: 'receptions',
                entite: $reception,
                donneesApres: [
                    'numero_reception' => $reception->numero_reception,
                    'nb_lots_crees'    => $reception->lignes()->count(),
                ],
            );

            return $reception;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // MÉTHODES PRIVÉES
    // ═══════════════════════════════════════════════════════════════

    private function creerLignes(Reception $reception, array $lignes): void
    {
        foreach ($lignes as $ligne) {
            $ligneHt  = $ligne['quantite_recue'] * $ligne['prix_achat_ht_unitaire'];
            $ligneTva = $ligneHt * (($ligne['taux_tva'] ?? 0) / 100);

            LigneReception::create([
                'reception_id'           => $reception->id,
                'ligne_achat_id'         => $ligne['ligne_achat_id'] ?? null,
                'medicament_id'          => $ligne['medicament_id'],
                'numero_lot'             => $ligne['numero_lot'],
                'date_peremption'        => $ligne['date_peremption'],
                'date_fabrication'       => $ligne['date_fabrication'] ?? null,
                'quantite_recue'         => $ligne['quantite_recue'],
                'prix_achat_ht_unitaire' => $ligne['prix_achat_ht_unitaire'],
                'taux_tva'               => $ligne['taux_tva'] ?? 0,
                'montant_ht'             => $ligneHt,
                'montant_ttc'            => $ligneHt + $ligneTva,
            ]);
        }
    }

    private function calculerTotaux(array $lignes): array
    {
        $ht  = 0;
        $tva = 0;

        foreach ($lignes as $ligne) {
            $ligneHt  = $ligne['quantite_recue'] * $ligne['prix_achat_ht_unitaire'];
            $ligneTva = $ligneHt * (($ligne['taux_tva'] ?? 0) / 100);

            $ht  += $ligneHt;
            $tva += $ligneTva;
        }

        return ['ht' => $ht, 'tva' => $tva, 'ttc' => $ht + $tva];
    }

    private function majStatutAchat(Achat $achat): void
    {
        $achat->load('lignes');

        $entierementRecu = true;
        $auMoinsUneLigne = false;

        foreach ($achat->lignes as $ligne) {
            if ($ligne->quantite_recue > 0) {
                $auMoinsUneLigne = true;
            }
            if ($ligne->quantite_recue < $ligne->quantite_commandee) {
                $entierementRecu = false;
            }
        }

        if ($entierementRecu) {
            $achat->statut = 'livree';
        } elseif ($auMoinsUneLigne) {
            $achat->statut = 'partiellement_livree';
        }

        $achat->save();
    }

    private function genererNumeroReception(): string
    {
        $annee   = now()->year;
        $prefixe = "REC-{$annee}-";

        $dernier = Reception::withTrashed()
            ->where('numero_reception', 'like', "{$prefixe}%")
            ->orderBy('numero_reception', 'desc')
            ->first();

        $numero = $dernier ? ((int) substr($dernier->numero_reception, -4) + 1) : 1;

        return $prefixe . str_pad($numero, 4, '0', STR_PAD_LEFT);
    }
}