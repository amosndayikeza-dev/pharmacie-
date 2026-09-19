<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la modification d'un animal (API).
 */
class UpdateAnimalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'proprietaire_id'      => ['sometimes', 'integer', 'exists:proprietaires,id'],
            'espece_id'            => ['sometimes', 'integer', 'exists:especes,id'],

            'nom'                  => ['nullable', 'string', 'max:100'],
            'numero_identification'=> ['nullable', 'string', 'max:100'],
            'sexe'                 => ['nullable', 'in:M,F,Inconnu'],
            'date_naissance'       => ['nullable', 'date', 'before_or_equal:today'],

            'race'                 => ['nullable', 'string', 'max:100'],
            'couleur'              => ['nullable', 'string', 'max:100'],
            'poids_kg'             => ['nullable', 'numeric', 'min:0', 'max:9999.99'],
            'taille'               => ['nullable', 'string', 'max:50'],

            'sterilise'            => ['sometimes', 'boolean'],
            'gestante'             => ['sometimes', 'boolean'],
            'allaitante'           => ['sometimes', 'boolean'],
            'vivant'               => ['sometimes', 'boolean'],

            'allergies'            => ['nullable', 'string'],
            'antecedents'          => ['nullable', 'string'],
            'notes'                => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'proprietaire_id.exists' => 'Ce propriétaire n\'existe pas.',
            'espece_id.exists'       => 'Cette espèce n\'existe pas.',
            'sexe.in'                => 'Le sexe doit être M, F ou Inconnu.',
            'poids_kg.numeric'       => 'Le poids doit être un nombre.',
            'date_naissance.before_or_equal' => 'La date de naissance ne peut pas être dans le futur.',
        ];
    }
}