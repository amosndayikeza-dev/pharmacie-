<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'une ordonnance pour l'API.
 */
class OrdonnanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'animal_id'          => $this->animal_id,
            'veterinaire_id'     => $this->veterinaire_id,
            'numero_ordonnance'  => $this->numero_ordonnance,
            'date_prescription'  => $this->date_prescription?->toDateString(),
            'date_fin_validite'  => $this->date_fin_validite?->toDateString(),
            'fichier_scan'       => $this->fichier_scan,
            'diagnostic'         => $this->diagnostic,
            'observations'       => $this->observations,

            // Champs calculés
            'est_valide' => $this->estValide(),

            // Relations (chargées à la demande)
            'animal'      => $this->whenLoaded('animal'),
            'veterinaire' => $this->whenLoaded('veterinaire'),
            'ventes'      => $this->whenLoaded('ventes'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}