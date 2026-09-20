<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'un mouvement de stock pour l'API.
 *
 * ⚠️ Lecture seule : on ne modifie jamais un mouvement.
 */
class MouvementStockResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'lot_id'         => $this->lot_id,
            'date_heure'     => $this->date_heure?->toISOString(),
            'quantite'       => $this->quantite,
            'type'           => $this->type,
            'reference_id'   => $this->reference_id,
            'reference_type' => $this->reference_type,
            'utilisateur_id' => $this->utilisateur_id,
            'motif'          => $this->motif,

            // Champs calculés
            'est_entree' => $this->estEntree(),
            'est_sortie' => $this->estSortie(),

            // Relations (chargées à la demande)
            'lot'         => $this->whenLoaded('lot'),
            'utilisateur' => $this->whenLoaded('utilisateur'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}