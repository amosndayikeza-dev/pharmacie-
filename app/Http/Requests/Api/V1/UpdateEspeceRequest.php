<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation pour la modification d'une espèce (API).
 */
class UpdateEspeceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Récupère l'ID depuis la route
        $especeId = $this->route('espece') ?? $this->route('id');

        return [
            'nom' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('especes', 'nom')->ignore($especeId),
            ],
            'nom_scientifique' => ['nullable', 'string', 'max:150'],
            'categorie'        => ['sometimes', 'in:compagnie,elevage,volaille,equin,autre'],
            'description'      => ['nullable', 'string'],
            'actif'            => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nom.unique'   => 'Cette espèce existe déjà.',
            'categorie.in' => 'La catégorie est invalide.',
        ];
    }
}