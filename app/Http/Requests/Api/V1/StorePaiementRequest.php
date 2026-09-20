<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour l'ajout d'un paiement à une vente existante.
 */
class StorePaiementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vente_id'          => ['required', 'integer', 'exists:ventes,id'],
            'type'              => ['required', 'in:especes,carte,mobile_money,credit'],
            'montant'           => ['required', 'numeric', 'min:0.01'],
            'reference_externe' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'vente_id.required' => 'La vente est obligatoire.',
            'vente_id.exists'   => 'Cette vente n\'existe pas.',
            'type.required'     => 'Le type de paiement est obligatoire.',
            'type.in'           => 'Le type de paiement est invalide.',
            'montant.required'  => 'Le montant est obligatoire.',
            'montant.numeric'   => 'Le montant doit être un nombre.',
            'montant.min'       => 'Le montant doit être supérieur à 0.',
        ];
    }
}