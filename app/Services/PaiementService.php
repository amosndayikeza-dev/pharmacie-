<?php

namespace App\Services;

use App\Models\Paiement;
use App\Models\Vente;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Service métier des paiements.
 *
 * Gère l'ajout de paiements à une vente existante (multi-paiements).
 */
class PaiementService
{
    /**
     * Ajoute un paiement à une vente existante.
     *
     * ⚠️ Vérifications :
     *   - La vente doit être VALIDÉE (pas annulée)
     *   - Le montant ne peut pas dépasser le reste à payer
     */
    public function ajouter(array $data): Paiement
    {
        return DB::transaction(function () use ($data) {

            $vente = Vente::lockForUpdate()->findOrFail($data['vente_id']);

            // 1. Vérifier que la vente est valide
            if ($vente->statut !== 'validee') {
                throw ValidationException::withMessages([
                    'vente_id' => ['Impossible d\'ajouter un paiement à une vente annulée.'],
                ]);
            }

            $montant     = (float) $data['montant'];
            $resteAPayer = $vente->resteAPayer();

            // 2. Vérifier que le montant ne dépasse pas le reste à payer
            if ($montant > $resteAPayer + 0.01) {
                throw ValidationException::withMessages([
                    'montant' => [
                        sprintf(
                            'Le montant (%s) dépasse le reste à payer (%s).',
                            number_format($montant, 2),
                            number_format($resteAPayer, 2)
                        ),
                    ],
                ]);
            }

            // 3. Créer le paiement
            return Paiement::create([
                'vente_id'          => $vente->id,
                'type'              => $data['type'],
                'montant'           => $montant,
                'reference_externe' => $data['reference_externe'] ?? null,
            ]);
        });
    }
}