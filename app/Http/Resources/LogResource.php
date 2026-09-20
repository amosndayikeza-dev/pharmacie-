<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'utilisateur_id' => $this->utilisateur_id,
            'action'         => $this->action,
            'module'         => $this->module,
            'entite_type'    => $this->entite_type,
            'entite_id'      => $this->entite_id,
            'donnees_avant'  => $this->donnees_avant,
            'donnees_apres'  => $this->donnees_apres,
            'ip_address'     => $this->ip_address,
            'user_agent'     => $this->user_agent,
            'date_heure'     => $this->date_heure?->toISOString(),
            'utilisateur'    => $this->whenLoaded('utilisateur'),
            'created_at'     => $this->created_at?->toISOString(),
            'updated_at'     => $this->updated_at?->toISOString(),
        ];
    }
}