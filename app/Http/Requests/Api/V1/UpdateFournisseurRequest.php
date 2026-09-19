<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la modification d'un fournisseur (API).
 */
class UpdateFournisseurRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom'                   => ['sometimes', 'required', 'string', 'max:150'],
            'raison_sociale'        => ['nullable', 'string', 'max:200'],
            'numero_contribuable'   => ['nullable', 'string', 'max:50'],
            'telephone'             => ['nullable', 'string', 'max:30'],
            'email'                 => ['nullable', 'email', 'max:150'],
            'adresse'               => ['nullable', 'string'],
            'ville'                 => ['nullable', 'string', 'max:100'],
            'pays'                  => ['nullable', 'string', 'max:100'],
            'delai_livraison_jours' => ['nullable', 'integer', 'min:0', 'max:365'],
            'notes'                 => ['nullable', 'string'],
            'actif'                 => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nom.required' => 'Le nom du fournisseur est obligatoire.',
            'email.email'  => 'L\'email n\'est pas valide.',
        ];
    }
}