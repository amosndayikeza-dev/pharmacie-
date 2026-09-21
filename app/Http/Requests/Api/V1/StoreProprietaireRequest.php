<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'un propriétaire (API).
 *
 * Un propriétaire peut être un particulier, une ferme, une clinique ou une société.
 * Il est le "payeur" des ventes et le propriétaire des animaux.
 */
class StoreProprietaireRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'                  => ['required', 'in:particulier,ferme,clinique,societe'],
            'nom'                   => ['required', 'string', 'max:100'],
            'prenom'                => ['nullable', 'string', 'max:100'],
            'raison_sociale'        => ['nullable', 'string', 'max:200'],
            'date_naissance'        => ['nullable', 'date', 'before:today'],
            'sexe'                  => ['nullable', 'in:M,F,Autre'],
            'telephone'             => ['nullable', 'string', 'max:30'],
            'email'                 => ['nullable', 'email', 'max:150'],
            'adresse'               => ['nullable', 'string', 'max:500'],
            'ville'                 => ['nullable', 'string', 'max:100'],
            'province'              => ['nullable', 'string', 'max:100'],
            'pays'                  => ['nullable', 'string', 'max:100'],
            'numero_piece_identite' => ['nullable', 'string', 'max:50'],
            'numero_contribuable'   => ['nullable', 'string', 'max:50'],
            'consentement_rgpd'     => ['sometimes', 'boolean'],
            'notes'                 => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.required'          => 'Le type de propriétaire est obligatoire.',
            'type.in'                => 'Le type doit être : particulier, ferme, clinique ou société.',
            'nom.required'           => 'Le nom est obligatoire.',
            'nom.max'                => 'Le nom ne peut pas dépasser 100 caractères.',
            'email.email'            => 'L\'adresse email n\'est pas valide.',
            'date_naissance.before'  => 'La date de naissance doit être dans le passé.',
            'sexe.in'                => 'Le sexe doit être M, F ou Autre.',
        ];
    }
}