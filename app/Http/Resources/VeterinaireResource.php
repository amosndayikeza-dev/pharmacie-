<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'un vétérinaire pour l'API.
 */
class VeterinaireResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'nom'             => $this->nom,
            'prenom'          => $this->prenom,
            'nom_complet'     => $this->nomComplet(),
            'numero_ordre'    => $this->numero_ordre,
            'specialite'      => $this->specialite,
            'telephone'       => $this->telephone,
            'email'           => $this->email,
            'adresse_cabinet' => $this->adresse_cabinet,
            'actif'           => $this->actif,

            // Statistiques (chargées uniquement si demandé)
            'nb_ordonnances'  => $this->when(
                $request->has('with_stats'),
                fn () => $this->ordonnances()->count()
            ),
            'nb_vaccinations' => $this->when(
                $request->has('with_stats'),
                fn () => $this->vaccinations()->count()
            ),

            'created_at'      => $this->created_at?->toISOString(),
            'updated_at'      => $this->updated_at?->toISOString(),
        ];
    }
}