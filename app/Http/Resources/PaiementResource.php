<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaiementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'vente_id'          => $this->vente_id,
            'type'              => $this->type,
            'libelle'           => $this->libelle(),  // ← helper du model
            'montant'           => $this->montant,
            'reference_externe' => $this->reference_externe,

            // Relation (chargée à la demande)
            'vente' => $this->whenLoaded('vente'),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
