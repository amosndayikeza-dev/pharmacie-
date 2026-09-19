<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'une espèce (API).
 */
class StoreEspeceRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Le middleware 'role.api' a déjà vérifié le rôle
        return true;
    }

    public function rules(): array
    {
        return [
            'nom'              => ['required', 'string', 'max:100', 'unique:especes,nom'],
            'nom_scientifique' => ['nullable', 'string', 'max:150'],
            'categorie'        => ['required', 'in:compagnie,elevage,volaille,equin,autre'],
            'description'      => ['nullable', 'string'],
            'actif'            => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nom.required'       => 'Le nom de l\'espèce est obligatoire.',
            'nom.unique'         => 'Cette espèce existe déjà.',
            'categorie.required' => 'La catégorie est obligatoire.',
            'categorie.in'       => 'La catégorie est invalide.',
        ];
    }
}