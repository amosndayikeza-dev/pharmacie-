<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transformation d'une vente pour l'API.
 */
class VenteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'numero_ticket'      => $this->numero_ticket,
            'proprietaire_id'    => $this->proprietaire_id,
            'animal_id'          => $this->animal_id,
            'utilisateur_id'     => $this->utilisateur_id,
            'ordonnance_id'      => $this->ordonnance_id,
            'date_heure'         => $this->date_heure?->toISOString(),
            'montant_total_ht'   => $this->montant_total_ht,
            'montant_total_tva'  => $this->montant_total_tva,
            'montant_total_ttc'  => $this->montant_total_ttc,
            'montant_remise'     => $this->montant_remise,
            'statut'             => $this->statut,

            // Champs calculés
            'montant_paye'  => $this->montantPaye(),
            'reste_a_payer' => $this->when(
                $this->relationLoaded('paiements'),
                fn () => (float) $this->paiements
                    ->filter(fn ($p) => $p->type === 'credit')
                    ->sum(fn ($p) => $p->resteAPayer())
            ),
            'est_soldee'    => $this->estSoldee(),

            // Relations (chargées à la demande)
            'proprietaire' => $this->whenLoaded('proprietaire'),
            'animal'       => $this->whenLoaded('animal'),
            'utilisateur'  => $this->whenLoaded('utilisateur'),
            'ordonnance'   => $this->whenLoaded('ordonnance'),
            'lignes'       => LigneVenteResource::collection($this->whenLoaded('lignes')),
            'paiements'    => $this->whenLoaded('paiements'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            
        ];
    }
}