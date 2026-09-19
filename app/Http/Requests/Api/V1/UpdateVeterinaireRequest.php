<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation pour la modification d'un vétérinaire.
 */
class UpdateVeterinaireRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $veterinaireParam = $this->route('veterinaire') ?? $this->route('id');
        $veterinaireId = is_object($veterinaireParam)
            ? $veterinaireParam->id
            : $veterinaireParam;

        return [
            'nom'          => ['sometimes', 'required', 'string', 'max:100'],
            'prenom'       => ['nullable', 'string', 'max:100'],
            'numero_ordre' => [
                'nullable', 'string', 'max:50',
                Rule::unique('veterinaires', 'numero_ordre')->ignore($veterinaireId),
            ],
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
            'nom.required'        => 'Le nom du vétérinaire est obligatoire.',
            'numero_ordre.unique' => 'Ce numéro d\'ordre est déjà utilisé.',
            'email.email'         => 'L\'adresse email n\'est pas valide.',
        ];
    }
}