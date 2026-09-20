<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RapportJournalierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'date_reference' => $this->date_reference?->toDateString(),

            // CA
            'total_ca_ht'  => $this->total_ca_ht,
            'total_ca_tva' => $this->total_ca_tva,
            'total_ca_ttc' => $this->total_ca_ttc,

            // Marge
            'total_marge_brute_ttc' => $this->total_marge_brute_ttc,

            // Stats
            'nb_tickets'         => $this->nb_tickets,
            'nb_clients_uniques' => $this->nb_clients_uniques,
            'panier_moyen'       => $this->panier_moyen,

            // Top médicament
            'top_medicament_id'       => $this->top_medicament_id,
            'top_medicament_quantite' => $this->top_medicament_quantite,
            'top_medicament'          => $this->whenLoaded('topMedicament'),

            // Répartition paiements
            'total_especes'      => $this->total_especes,
            'total_carte'        => $this->total_carte,
            'total_mobile_money' => $this->total_mobile_money,
            'total_credit'       => $this->total_credit,

            // Répartition espèces
            'repartition_par_espece' => $this->repartition_par_espece,

            // Meta
            'calcule_le' => $this->calcule_le?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}