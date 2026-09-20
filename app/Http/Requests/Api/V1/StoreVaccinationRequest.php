<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'une vaccination (API).
 */
class StoreVaccinationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'animal_id'             => ['required', 'integer', 'exists:animaux,id'],
            'veterinaire_id'        => ['nullable', 'integer', 'exists:veterinaires,id'],
            'medicament_id'         => ['nullable', 'integer', 'exists:medicaments,id'],
            'nom_vaccin'            => ['required', 'string', 'max:150'],
            'numero_lot_vaccin'     => ['nullable', 'string', 'max:100'],
            'date_vaccination'      => ['required', 'date', 'before_or_equal:today'],
            'date_prochain_rappel'  => ['nullable', 'date', 'after:date_vaccination'],
            'observations'          => ['nullable', 'string'],
            'reaction'              => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'animal_id.required'                => 'L\'animal est obligatoire.',
            'animal_id.exists'                  => 'Cet animal n\'existe pas.',
            'veterinaire_id.exists'             => 'Ce vétérinaire n\'existe pas.',
            'medicament_id.exists'              => 'Ce médicament n\'existe pas.',
            'nom_vaccin.required'               => 'Le nom du vaccin est obligatoire.',
            'date_vaccination.required'         => 'La date de vaccination est obligatoire.',
            'date_vaccination.before_or_equal'  => 'La date de vaccination ne peut pas être dans le futur.',
            'date_prochain_rappel.after'        => 'La date du prochain rappel doit être après la vaccination.',
        ];
    }
}