<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'un médicament (API).
 */
class StoreMedicamentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Le middleware 'role.api' a déjà vérifié le rôle
        return true;
    }

    public function rules(): array
    {
        return [
            'code_cip'                 => ['required', 'string', 'max:50', 'unique:medicaments,code_cip'],
            'nom'                      => ['required', 'string', 'max:200'],
            'denomination_commune'     => ['nullable', 'string', 'max:200'],
            'forme'                    => ['nullable', 'string', 'max:50'],
            'dosage'                   => ['nullable', 'string', 'max:50'],
            'laboratoire'              => ['nullable', 'string', 'max:150'],
            'categorie'                => ['nullable', 'string', 'max:100'],
            'sur_ordonnance'           => ['boolean'],
            'usage_preventif'          => ['boolean'],
            'posologie'                => ['nullable', 'string'],
            'voie_administration'      => ['nullable', 'string', 'max:100'],
            'delai_attente'            => ['nullable', 'string', 'max:100'],
            'prix_vente_ttc_reference' => ['required', 'numeric', 'min:0'],
            'taux_tva'                 => ['nullable', 'numeric', 'min:0', 'max:100'],
            'seuil_alerte'             => ['nullable', 'integer', 'min:0'],
            'stock_max'                => ['nullable', 'integer', 'min:0'],
            'especes'                  => ['nullable', 'array'],
            'especes.*'                => ['integer', 'exists:especes,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'code_cip.required'                 => 'Le code CIP est obligatoire.',
            'code_cip.unique'                   => 'Ce code CIP existe déjà.',
            'nom.required'                      => 'Le nom du médicament est obligatoire.',
            'prix_vente_ttc_reference.required' => 'Le prix de vente est obligatoire.',
            'prix_vente_ttc_reference.numeric'  => 'Le prix doit être un nombre.',
        ];
    }
}