<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'une réception (API).
 *
 * ⚠️ La réception est créée en BROUILLON : aucun lot n'est créé à ce stade.
 *    Les lots seront créés à la VALIDATION de la réception.
 */
class StoreReceptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'achat_id'             => ['nullable', 'integer', 'exists:achats,id'],
            'fournisseur_id'       => ['required', 'integer', 'exists:fournisseurs,id'],
            'date_reception'       => ['required', 'date', 'before_or_equal:today'],
            'numero_bon_livraison' => ['nullable', 'string', 'max:100'],
            'observations'         => ['nullable', 'string'],

            // Lignes de réception (au moins 1)
            'lignes'                            => ['required', 'array', 'min:1'],
            'lignes.*.ligne_achat_id'           => ['nullable', 'integer', 'exists:ligne_achats,id'],
            'lignes.*.medicament_id'            => ['required', 'integer', 'exists:medicaments,id'],
            'lignes.*.numero_lot'               => ['required', 'string', 'max:100'],
            'lignes.*.date_peremption'          => ['required', 'date', 'after:today'],
            'lignes.*.date_fabrication'         => ['nullable', 'date', 'before_or_equal:today'],
            'lignes.*.quantite_recue'           => ['required', 'integer', 'min:1'],
            'lignes.*.prix_achat_ht_unitaire'   => ['required', 'numeric', 'min:0'],
            'lignes.*.taux_tva'                 => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'fournisseur_id.required'              => 'Le fournisseur est obligatoire.',
            'fournisseur_id.exists'                => 'Ce fournisseur n\'existe pas.',
            'date_reception.required'              => 'La date de réception est obligatoire.',
            'date_reception.before_or_equal'       => 'La date de réception ne peut pas être dans le futur.',
            'lignes.required'                      => 'La réception doit contenir au moins une ligne.',
            'lignes.min'                           => 'La réception doit contenir au moins un médicament.',
            'lignes.*.medicament_id.required'      => 'Le médicament est obligatoire sur chaque ligne.',
            'lignes.*.numero_lot.required'         => 'Le numéro de lot est obligatoire.',
            'lignes.*.date_peremption.required'    => 'La date de péremption est obligatoire.',
            'lignes.*.date_peremption.after'       => 'La date de péremption doit être dans le futur.',
            'lignes.*.quantite_recue.required'     => 'La quantité reçue est obligatoire.',
            'lignes.*.quantite_recue.min'          => 'La quantité doit être au moins 1.',
            'lignes.*.prix_achat_ht_unitaire.required' => 'Le prix d\'achat est obligatoire.',
        ];
    }
}