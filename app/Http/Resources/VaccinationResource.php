<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'une vaccination pour l'API.
 */
class VaccinationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'animal_id'             => $this->animal_id,
            'veterinaire_id'        => $this->veterinaire_id,
            'medicament_id'         => $this->medicament_id,
            'nom_vaccin'            => $this->nom_vaccin,
            'numero_lot_vaccin'     => $this->numero_lot_vaccin,
            'date_vaccination'      => $this->date_vaccination?->toDateString(),
            'date_prochain_rappel'  => $this->date_prochain_rappel?->toDateString(),
            'observations'          => $this->observations,
            'reaction'              => $this->reaction,

            // Champs calculés
            'rappel_proche'   => $this->rappelProche(),
            'rappel_en_retard' => $this->rappelEnRetard(),

            // Relations (chargées à la demande)
            'animal'      => $this->whenLoaded('animal'),
            'veterinaire' => $this->whenLoaded('veterinaire'),
            'medicament'  => $this->whenLoaded('medicament'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}