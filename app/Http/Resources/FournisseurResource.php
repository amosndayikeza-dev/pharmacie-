<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'un fournisseur pour l'API.
 *
 * Contrôle exactement ce qui est exposé au frontend.
 */
class FournisseurResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'nom'                   => $this->nom,
            'raison_sociale'        => $this->raison_sociale,
            'numero_contribuable'   => $this->numero_contribuable,
            'telephone'             => $this->telephone,
            'email'                 => $this->email,
            'adresse'               => $this->adresse,
            'ville'                 => $this->ville,
            'pays'                  => $this->pays,
            'delai_livraison_jours' => $this->delai_livraison_jours,
            'notes'                 => $this->notes,
            'actif'                 => $this->actif,

            // Relations (chargées à la demande)
            'lots'       => $this->whenLoaded('lots'),
            'achats'     => $this->whenLoaded('achats'),
            'receptions' => $this->whenLoaded('receptions'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}