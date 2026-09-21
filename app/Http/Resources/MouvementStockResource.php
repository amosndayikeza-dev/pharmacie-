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
        'quantite'       => (int) $this->quantite,
        'type'           => $this->type,

        //  Nettoyer le type de référence
        'reference_id'   => $this->reference_id,
        'reference_type' => $this->reference_type
            ? class_basename($this->reference_type)   // ← 'Vente' au lieu de 'App\Models\Vente'
            : null,

        'utilisateur_id' => $this->utilisateur_id,
        'motif'          => $this->motif,

        // Relations
        'lot'            => new LotResource($this->whenLoaded('lot')),
        'utilisateur'    => $this->whenLoaded('utilisateur', fn () => [
            'id'     => $this->utilisateur->id,
            'nom'    => $this->utilisateur->nom,
            'prenom' => $this->utilisateur->prenom,
        ]),

        'created_at'     => $this->created_at?->toISOString(),
    ];
}
}