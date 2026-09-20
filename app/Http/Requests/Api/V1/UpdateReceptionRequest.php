<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la modification d'une réception (API).
 *
 * ⚠️ Modifiable UNIQUEMENT si statut = 'brouillon'.
 */
class UpdateReceptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_reception'       => ['sometimes', 'date', 'before_or_equal:today'],
            'numero_bon_livraison' => ['nullable', 'string', 'max:100'],
            'observations'         => ['nullable', 'string'],

            // On peut remplacer les lignes uniquement en brouillon
            'lignes'                            => ['sometimes', 'array', 'min:1'],
            'lignes.*.ligne_achat_id'           => ['nullable', 'integer', 'exists:ligne_achats,id'],
            'lignes.*.medicament_id'            => ['required_with:lignes', 'integer', 'exists:medicaments,id'],
            'lignes.*.numero_lot'               => ['required_with:lignes', 'string', 'max:100'],
            'lignes.*.date_peremption'          => ['required_with:lignes', 'date', 'after:today'],
            'lignes.*.date_fabrication'         => ['nullable', 'date', 'before_or_equal:today'],
            'lignes.*.quantite_recue'           => ['required_with:lignes', 'integer', 'min:1'],
            'lignes.*.prix_achat_ht_unitaire'   => ['required_with:lignes', 'numeric', 'min:0'],
            'lignes.*.taux_tva'                 => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'date_reception.before_or_equal'       => 'La date de réception ne peut pas être dans le futur.',
            'lignes.min'                           => 'La réception doit contenir au moins un médicament.',
            'lignes.*.medicament_id.required_with' => 'Le médicament est obligatoire sur chaque ligne.',
            'lignes.*.numero_lot.required_with'    => 'Le numéro de lot est obligatoire.',
            'lignes.*.date_peremption.after'       => 'La date de péremption doit être dans le futur.',
            'lignes.*.quantite_recue.min'          => 'La quantité doit être au moins 1.',
        ];
    }
}