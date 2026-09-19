<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreFournisseurRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nom'                   => ['required', 'string', 'max:150'],
            'raison_sociale'        => ['nullable', 'string', 'max:200'],
            'numero_contribuable'   => ['nullable', 'string', 'max:50'],
            'telephone'             => ['nullable', 'string', 'max:30'],
            'email'                 => ['nullable', 'email', 'max:150'],
            'adresse'               => ['nullable', 'string'],
            'ville'                 => ['nullable', 'string', 'max:100'],
            'pays'                  => ['nullable', 'string', 'max:100'],
            'delai_livraison_jours' => ['nullable', 'integer', 'min:0', 'max:365'],
            'notes'                 => ['nullable', 'string'],
            'actif'                 => ['boolean'],
        ];
    }
}