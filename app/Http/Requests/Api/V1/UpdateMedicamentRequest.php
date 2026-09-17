<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validation pour la modification d'un médicament (API).
 *
 * Différences avec StoreMedicamentRequest :
 *   - Utilise parfois 'sometimes' pour permettre les PATCH partiels
 *   - La règle unique sur code_cip ignore l'enregistrement courant
 */
class UpdateMedicamentRequest extends FormRequest
{
    /**
     * Autorisation : le middleware 'role.api' a déjà vérifié.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Règles de validation.
     */
    public function rules(): array
    {
        // Récupérer l'ID du médicament depuis la route
        $medicamentId = $this->route('medicament') ?? $this->route('id');

        return [
            'code_cip' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('medicaments', 'code_cip')->ignore($medicamentId),
            ],
            'code_barre'               => ['nullable', 'string', 'max:50'],
            'nom'                      => ['sometimes', 'required', 'string', 'max:200'],
            'denomination_commune'     => ['nullable', 'string', 'max:200'],
            'forme'                    => ['nullable', 'string', 'max:50'],
            'dosage'                   => ['nullable', 'string', 'max:50'],
            'laboratoire'              => ['nullable', 'string', 'max:150'],
            'categorie'                => ['nullable', 'string', 'max:100'],
            'sur_ordonnance'           => ['sometimes', 'boolean'],
            'usage_preventif'          => ['sometimes', 'boolean'],
            'posologie'                => ['nullable', 'string'],
            'voie_administration'      => ['nullable', 'string', 'max:100'],
            'delai_attente'            => ['nullable', 'string', 'max:100'],
            'prix_vente_ttc_reference' => ['sometimes', 'required', 'numeric', 'min:0'],
            'taux_tva'                 => ['nullable', 'numeric', 'min:0', 'max:100'],
            'seuil_alerte'             => ['nullable', 'integer', 'min:0'],
            'stock_max'                => ['nullable', 'integer', 'min:0'],
            'actif'                    => ['sometimes', 'boolean'],
            'especes'                  => ['nullable', 'array'],
            'especes.*'                => ['integer', 'exists:especes,id'],
        ];
    }

    /**
     * Messages personnalisés en français.
     */
    public function messages(): array
    {
        return [
            'code_cip.required'                 => 'Le code CIP est obligatoire.',
            'code_cip.unique'                   => 'Ce code CIP est déjà utilisé par un autre médicament.',
            'nom.required'                      => 'Le nom du médicament est obligatoire.',
            'prix_vente_ttc_reference.required' => 'Le prix de vente est obligatoire.',
            'prix_vente_ttc_reference.numeric'  => 'Le prix doit être un nombre.',
            'prix_vente_ttc_reference.min'      => 'Le prix ne peut pas être négatif.',
        ];
    }
}