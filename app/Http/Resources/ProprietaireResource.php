<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'un propriétaire pour l'API.
 */
class ProprietaireResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                      => $this->id,
            'type'                    => $this->type,
            'nom'                     => $this->nom,
            'prenom'                  => $this->prenom,
            'nom_complet'             => $this->nomComplet(),
            'raison_sociale'          => $this->raison_sociale,
            'date_naissance'          => $this->date_naissance?->toDateString(),
            'sexe'                    => $this->sexe,
            'telephone'               => $this->telephone,
            'email'                   => $this->email,
            'adresse'                 => $this->adresse,
            'ville'                   => $this->ville,
            'province'                => $this->province,
            'pays'                    => $this->pays,
            'numero_piece_identite'   => $this->numero_piece_identite,
            'numero_contribuable'     => $this->numero_contribuable,
            'consentement_rgpd'       => $this->consentement_rgpd,
            'date_consentement'       => $this->date_consentement?->toISOString(),
            'notes'                   => $this->notes,

            // Relations (chargées à la demande)
            'nb_animaux' => $this->animaux_count ?? 0,
            'animaux' => $this->whenLoaded('animaux', function () {
                return $this->animaux->map(fn ($a) => [
                    'id'         => $a->id,
                    'nom'        => $a->nom,
                    'espece'     => $a->espece?->nom,
                ]);
            }),
            'nb_ventes'  => $this->ventes_count ?? 0,

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}