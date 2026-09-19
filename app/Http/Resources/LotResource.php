<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'un lot pour l'API.
 *
 * Le lot est immuable : aucun endpoint de modification n'est exposé.
 */
class LotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'medicament_id'          => $this->medicament_id,
            'fournisseur_id'         => $this->fournisseur_id,
            'numero_lot'             => $this->numero_lot,
            'date_peremption'        => $this->date_peremption?->toDateString(),
            'date_fabrication'       => $this->date_fabrication?->toDateString(),
            'prix_achat_ht_unitaire' => $this->prix_achat_ht_unitaire,
            'quantite_initiale'      => $this->quantite_initiale,
            'quantite_restante'      => $this->quantite_restante,

            // Champs calculés (helpers du model)
            'est_perime'              => $this->estPerime(),
            'jours_avant_peremption'  => $this->joursAvantPeremption(),

            // Relations (chargées à la demande)
            'medicament'  => $this->whenLoaded('medicament'),
            'fournisseur' => $this->whenLoaded('fournisseur'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}