<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\EspeceResource;


/**
 * Transformation d'un médicament pour l'API.
 *
 * Contrôle exactement ce qui est exposé au frontend.
 */
class MedicamentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                       => $this->id,
            'code_cip'                 => $this->code_cip,
            'nom'                      => $this->nom,
            'denomination_commune'     => $this->denomination_commune,
            'forme'                    => $this->forme,
            'dosage'                   => $this->dosage,
            'laboratoire'              => $this->laboratoire,
            'categorie'                => $this->categorie,
            'sur_ordonnance'           => $this->sur_ordonnance,
            'prix_vente_ttc_reference' => (float) $this->prix_vente_ttc_reference,
            'taux_tva'                 => (float) $this->taux_tva,
            'seuil_alerte'             => $this->seuil_alerte,
            'actif'                    => $this->actif,

            // Champs calculés (optionnels)
            'stock_disponible'         => $this->when(
                $request->has('with_stock'),
                fn () => $this->stockDisponible()
            ),

            // Relations (chargées à la demande)
            'especes'                  => EspeceResource::collection($this->whenLoaded('especes')),

            // Timestamps
            'created_at'               => $this->created_at?->toISOString(),
            'updated_at'               => $this->updated_at?->toISOString(),
        ];
    }
}