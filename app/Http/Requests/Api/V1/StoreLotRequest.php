<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'un lot (API).
 *
 * Le lot est créé à la RÉCEPTION d'une commande fournisseur.
 *
 * ⚠️ Un lot est IMMUABLE après création (principe "insert only" du CDC) :
 *   - On ne modifie JAMAIS un lot
 *   - Si erreur de saisie → on créera un mouvement d'ajustement tracé
 */
class StoreLotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'medicament_id'          => ['required', 'integer', 'exists:medicaments,id'],
            'fournisseur_id'         => ['required', 'integer', 'exists:fournisseurs,id'],
            'numero_lot'             => ['required', 'string', 'max:100'],
            'date_peremption'        => ['required', 'date', 'after:today'],
            'date_fabrication'       => ['nullable', 'date', 'before_or_equal:today'],
            'prix_achat_ht_unitaire' => ['required', 'numeric', 'min:0'],
            'quantite_initiale'      => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'medicament_id.required'          => 'Le médicament est obligatoire.',
            'medicament_id.exists'            => 'Ce médicament n\'existe pas.',
            'fournisseur_id.required'         => 'Le fournisseur est obligatoire.',
            'fournisseur_id.exists'           => 'Ce fournisseur n\'existe pas.',
            'numero_lot.required'             => 'Le numéro de lot est obligatoire.',
            'date_peremption.required'        => 'La date de péremption est obligatoire.',
            'date_peremption.after'           => 'La date de péremption doit être dans le futur.',
            'prix_achat_ht_unitaire.required' => 'Le prix d\'achat est obligatoire.',
            'prix_achat_ht_unitaire.numeric'  => 'Le prix d\'achat doit être un nombre.',
            'quantite_initiale.required'      => 'La quantité initiale est obligatoire.',
            'quantite_initiale.min'           => 'La quantité doit être au moins 1.',
        ];
    }
}