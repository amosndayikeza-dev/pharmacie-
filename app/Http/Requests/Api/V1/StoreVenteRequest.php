<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'une vente (API).
 *
 * ⚠️ Une vente est INSERT-ONLY : pas de modification, pas de suppression.
 *    Si erreur → on crée un AVOIR (autre vente avec statut = 'avoir').
 *
 * Le front envoie uniquement les médicaments + quantités.
 * Le VenteService s'occupe du FEFO, des prix, des marges et des mouvements.
 */
class StoreVenteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'proprietaire_id' => ['nullable', 'integer', 'exists:proprietaires,id'],
            'animal_id'       => ['nullable', 'integer', 'exists:animaux,id'],
            'ordonnance_id'   => ['nullable', 'integer', 'exists:ordonnances,id'],
            'montant_remise'  => ['nullable', 'numeric', 'min:0'],
            'montant_paye'    => ['nullable', 'numeric', 'min:0'],

            // Lignes : médicaments + quantités
            'lignes'                    => ['required', 'array', 'min:1'],
            'lignes.*.medicament_id'    => ['required', 'integer', 'exists:medicaments,id'],
            'lignes.*.quantite'         => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'proprietaire_id.exists'         => 'Ce propriétaire n\'existe pas.',
            'animal_id.exists'               => 'Cet animal n\'existe pas.',
            'ordonnance_id.exists'           => 'Cette ordonnance n\'existe pas.',
            'montant_remise.numeric'         => 'La remise doit être un nombre.',
            'montant_remise.min'             => 'La remise ne peut pas être négative.',
            'lignes.required'                => 'La vente doit contenir au moins une ligne.',
            'lignes.min'                     => 'La vente doit contenir au moins un médicament.',
            'lignes.*.medicament_id.required'=> 'Le médicament est obligatoire sur chaque ligne.',
            'lignes.*.medicament_id.exists'  => 'Un des médicaments n\'existe pas.',
            'lignes.*.quantite.required'     => 'La quantité est obligatoire.',
            'lignes.*.quantite.min'          => 'La quantité doit être au moins 1.',
        ];
    }
}