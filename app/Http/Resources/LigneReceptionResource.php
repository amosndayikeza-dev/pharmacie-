<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'une ligne de réception pour l'API.
 */
class LigneReceptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'reception_id'           => $this->reception_id,
            'ligne_achat_id'         => $this->ligne_achat_id,
            'medicament_id'          => $this->medicament_id,
            'numero_lot'             => $this->numero_lot,
            'date_peremption'        => $this->date_peremption?->toDateString(),
            'date_fabrication'       => $this->date_fabrication?->toDateString(),
            'quantite_recue'         => $this->quantite_recue,
            'prix_achat_ht_unitaire' => $this->prix_achat_ht_unitaire,
            'taux_tva'               => $this->taux_tva,
            'montant_ht'             => $this->montant_ht,
            'montant_ttc'            => $this->montant_ttc,

            // Relation (chargée à la demande)
            'medicament' => $this->whenLoaded('medicament'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}