<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'un animal pour l'API.
 */
class AnimalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'proprietaire_id'       => $this->proprietaire_id,
            'espece_id'             => $this->espece_id,

            // Identification
            'nom'                   => $this->nom,
            'numero_identification' => $this->numero_identification,
            'sexe'                  => $this->sexe,
            'date_naissance'        => $this->date_naissance?->toDateString(),
            'age_annees'            => $this->ageAnnees(),
            'nom_affichage'         => $this->nomAffichage(),

            // Caractéristiques
            'race'                  => $this->race,
            'couleur'               => $this->couleur,
            'poids_kg'              => $this->poids_kg,
            'taille'                => $this->taille,

            // État
            'sterilise'             => $this->sterilise,
            'gestante'              => $this->gestante,
            'allaitante'            => $this->allaitante,
            'vivant'                => $this->vivant,

            // Notes médicales
            'allergies'             => $this->allergies,
            'antecedents'           => $this->antecedents,
            'notes'                 => $this->notes,

            // Relations (chargées à la demande)
            'proprietaire'  => $this->whenLoaded('proprietaire'),
            'espece'        => $this->whenLoaded('espece'),
            'ordonnances'   => $this->whenLoaded('ordonnances'),
            'vaccinations'  => $this->whenLoaded('vaccinations'),
            'ventes'        => $this->whenLoaded('ventes'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}