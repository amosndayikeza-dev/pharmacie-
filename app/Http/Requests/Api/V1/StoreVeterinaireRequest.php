<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'un vétérinaire.
 *
 * Un vétérinaire est un acteur légal externe : il prescrit des ordonnances.
 */
class StoreVeterinaireRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom'             => ['required', 'string', 'max:100'],
            'prenom'          => ['nullable', 'string', 'max:100'],
            'numero_ordre'    => ['nullable', 'string', 'max:50', 'unique:veterinaires,numero_ordre'],
            'specialite'      => ['nullable', 'string', 'max:150'],
            'telephone'       => ['nullable', 'string', 'max:30'],
            'email'           => ['nullable', 'email', 'max:150'],
            'adresse_cabinet' => ['nullable', 'string', 'max:500'],
            'actif'           => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nom.required'          => 'Le nom du vétérinaire est obligatoire.',
            'nom.max'               => 'Le nom ne peut pas dépasser 100 caractères.',
            'numero_ordre.unique'   => 'Ce numéro d\'ordre est déjà utilisé par un autre vétérinaire.',
            'email.email'           => 'L\'adresse email n\'est pas valide.',
            'email.max'             => 'L\'email ne peut pas dépasser 150 caractères.',
        ];
    }
}