<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'une réception pour l'API.
 */
class ReceptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'numero_reception'      => $this->numero_reception,
            'achat_id'              => $this->achat_id,
            'fournisseur_id'        => $this->fournisseur_id,
            'utilisateur_id'        => $this->utilisateur_id,
            'date_reception'        => $this->date_reception?->toDateString(),
            'numero_bon_livraison'  => $this->numero_bon_livraison,
            'montant_total_ht'      => $this->montant_total_ht,
            'montant_total_tva'     => $this->montant_total_tva,
            'montant_total_ttc'     => $this->montant_total_ttc,
            'statut'                => $this->statut,
            'observations'          => $this->observations,

            // Relations (chargées à la demande)
            'achat'       => $this->whenLoaded('achat'),
            'fournisseur' => $this->whenLoaded('fournisseur'),
            'utilisateur' => $this->whenLoaded('utilisateur'),
            'lignes'      => LigneReceptionResource::collection($this->whenLoaded('lignes')),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}