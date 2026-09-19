<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'une ordonnance (API).
 */
class StoreOrdonnanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'animal_id'          => ['required', 'integer', 'exists:animaux,id'],
            'veterinaire_id'     => ['nullable', 'integer', 'exists:veterinaires,id'],
            'numero_ordonnance'  => ['nullable', 'string', 'max:100'],
            'date_prescription'  => ['required', 'date', 'before_or_equal:today'],
            'date_fin_validite'  => ['nullable', 'date', 'after_or_equal:date_prescription'],
            'fichier_scan'       => ['nullable', 'string', 'max:255'],
            'diagnostic'         => ['nullable', 'string'],
            'observations'       => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'animal_id.required'                  => 'L\'animal est obligatoire.',
            'animal_id.exists'                    => 'Cet animal n\'existe pas.',
            'veterinaire_id.exists'               => 'Ce vétérinaire n\'existe pas.',
            'date_prescription.required'          => 'La date de prescription est obligatoire.',
            'date_prescription.before_or_equal'   => 'La date de prescription ne peut pas être dans le futur.',
            'date_fin_validite.after_or_equal'    => 'La date de fin de validité doit être après la date de prescription.',
        ];
    }
}