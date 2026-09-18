<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'un utilisateur pour l'API.
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'nom'                => $this->nom,
            'prenom'             => $this->prenom,
            'nom_complet'        => $this->nomComplet(),
            'email'              => $this->email,
            'role'               => $this->role,
            'actif'              => $this->actif,
            'derniere_connexion' => $this->derniere_connexion?->toISOString(),
            'date_de_creation'   => $this->date_de_creation?->toISOString(),
            'created_at'         => $this->created_at?->toISOString(),
            'updated_at'         => $this->updated_at?->toISOString(),
        ];
    }
}