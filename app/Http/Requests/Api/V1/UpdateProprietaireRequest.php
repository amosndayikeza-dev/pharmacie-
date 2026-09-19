<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la modification d'un propriétaire (API).
 */
class UpdateProprietaireRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type'                    => ['sometimes', 'in:particulier,ferme,clinique,societe'],
            'nom'                     => ['sometimes', 'required', 'string', 'max:100'],
            'prenom'                  => ['nullable', 'string', 'max:100'],
            'raison_sociale'          => ['nullable', 'string', 'max:200'],
            'date_naissance'          => ['nullable', 'date', 'before:today'],
            'sexe'                    => ['nullable', 'in:M,F,Autre'],
            'telephone'               => ['nullable', 'string', 'max:30'],
            'email'                   => ['nullable', 'email', 'max:150'],
            'adresse'                 => ['nullable', 'string'],
            'ville'                   => ['nullable', 'string', 'max:100'],
            'province'                => ['nullable', 'string', 'max:100'],
            'pays'                    => ['nullable', 'string', 'max:100'],
            'numero_piece_identite'   => ['nullable', 'string', 'max:50'],
            'numero_contribuable'     => ['nullable', 'string', 'max:50'],
            'consentement_rgpd'       => ['sometimes', 'boolean'],
            'date_consentement'       => ['nullable', 'date'],
            'notes'                   => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.in'             => 'Le type doit être : particulier, ferme, clinique ou société.',
            'nom.required'        => 'Le nom est obligatoire.',
            'email.email'         => 'L\'email n\'est pas valide.',
            'date_naissance.before' => 'La date de naissance doit être dans le passé.',
        ];
    }
}