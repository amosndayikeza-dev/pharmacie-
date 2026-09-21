<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'une espèce animale pour l'API.
 *
 * Contrôle exactement ce qui est exposé au frontend.
 */
class EspeceRessource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'nom'             => $this->nom,
            'nom_scientifique'=> $this->nom_scientifique,
            'categorie'       => $this->categorie,
            'description'     => $this->description,
            'actif'           => $this->actif,

            // Relations (chargées à la demande)
            'medicaments'     => MedicamentResource::collection($this->whenLoaded('medicaments')),
            'animaux'         => AnimalResource::collection($this->whenLoaded('animaux')),

            // Compteurs
            'nb_animaux'      => $this->when(
                $request->has('with_count'),
                fn () => $this->animaux()->count()
            ),

            // Timestamps
            'created_at'      => $this->created_at?->toISOString(),
            'updated_at'      => $this->updated_at?->toISOString(),
        ];
    }
}