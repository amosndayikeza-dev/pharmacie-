<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'une ligne de vente pour l'API.
 */
class LigneVenteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                          => $this->id,
            'vente_id'                    => $this->vente_id,
            'lot_id'                      => $this->lot_id,
            'medicament_id'               => $this->medicament_id,
            'quantite'                    => $this->quantite,
            'prix_vente_ttc_unitaire'     => $this->prix_vente_ttc_unitaire,
            'prix_achat_ht_unitaire_fige' => $this->prix_achat_ht_unitaire_fige,
            'taux_tva'                    => $this->taux_tva,
            'montant_ht'                  => $this->montant_ht,
            'montant_tva'                 => $this->montant_tva,
            'montant_ttc'                 => $this->montant_ttc,
            'marge_brute'                 => $this->marge_brute,

            // Relations (chargées à la demande)
            'lot'        => $this->whenLoaded('lot'),
            'medicament' => $this->whenLoaded('medicament'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}