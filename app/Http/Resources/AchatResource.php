<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'une commande d'achat pour l'API.
 */
class AchatResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'numero_commande'       => $this->numero_commande,
            'fournisseur_id'        => $this->fournisseur_id,
            'utilisateur_id'        => $this->utilisateur_id,
            'date_commande'         => $this->date_commande?->toDateString(),
            'date_livraison_prevue' => $this->date_livraison_prevue?->toDateString(),
            'montant_total_ht'      => $this->montant_total_ht,
            'montant_total_tva'     => $this->montant_total_tva,
            'montant_total_ttc'     => $this->montant_total_ttc,
            'statut'                => $this->statut,
            'notes'                 => $this->notes,

            // Relations (chargées à la demande)
            'fournisseur' => $this->whenLoaded('fournisseur'),
            'utilisateur' => $this->whenLoaded('utilisateur'),
            'lignes'      => LigneAchatResource::collection($this->whenLoaded('lignes')),
            'receptions'  => $this->whenLoaded('receptions'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}