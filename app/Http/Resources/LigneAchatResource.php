<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'une ligne de commande d'achat pour l'API.
 */
class LigneAchatResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'achat_id'               => $this->achat_id,
            'medicament_id'          => $this->medicament_id,
            'quantite_commandee'     => $this->quantite_commandee,
            'quantite_recue'         => $this->quantite_recue,
            'prix_achat_ht_unitaire' => $this->prix_achat_ht_unitaire,
            'taux_tva'               => $this->taux_tva,
            'montant_ht'             => $this->montant_ht,
            'montant_ttc'            => $this->montant_ttc,

            // Champs calculés
            'quantite_restante'      => $this->quantiteRestante(),
            'est_entierement_recue'  => $this->estEntierementRecue(),

            // Relation (chargée à la demande)
            'medicament' => $this->whenLoaded('medicament'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}