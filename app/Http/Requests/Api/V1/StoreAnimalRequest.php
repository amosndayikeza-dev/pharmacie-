<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'un animal (API).
 */
class StoreAnimalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Relations obligatoires
            'proprietaire_id'      => ['required', 'integer', 'exists:proprietaires,id'],
            'espece_id'            => ['required', 'integer', 'exists:especes,id'],

            // Identification
            'nom'                  => ['nullable', 'string', 'max:100'],
            'numero_identification'=> ['nullable', 'string', 'max:100'],
            'sexe'                 => ['nullable', 'in:M,F,Inconnu'],
            'date_naissance'       => ['nullable', 'date', 'before_or_equal:today'],

            // Caractéristiques
            'race'                 => ['nullable', 'string', 'max:100'],
            'couleur'              => ['nullable', 'string', 'max:100'],
            'poids_kg'             => ['nullable', 'numeric', 'min:0', 'max:9999.99'],
            'taille'               => ['nullable', 'string', 'max:50'],

            // État
            'sterilise'            => ['boolean'],
            'gestante'             => ['boolean'],
            'allaitante'           => ['boolean'],
            'vivant'               => ['boolean'],

            // Notes médicales
            'allergies'            => ['nullable', 'string'],
            'antecedents'          => ['nullable', 'string'],
            'notes'                => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'proprietaire_id.required' => 'Le propriétaire est obligatoire.',
            'proprietaire_id.exists'   => 'Ce propriétaire n\'existe pas.',
            'espece_id.required'       => 'L\'espèce est obligatoire.',
            'espece_id.exists'         => 'Cette espèce n\'existe pas.',
            'sexe.in'                  => 'Le sexe doit être M, F ou Inconnu.',
            'poids_kg.numeric'         => 'Le poids doit être un nombre.',
            'date_naissance.before_or_equal' => 'La date de naissance ne peut pas être dans le futur.',
        ];
    }
}