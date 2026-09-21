<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la modification d'une commande d'achat (API).
 *
 * ⚠️ RÈGLE MÉTIER : on ne peut modifier une commande QUE si elle
 *    est encore en statut 'brouillon'. Dès qu'elle est 'envoyee',
 *    elle est considérée comme partie chez le fournisseur.
 *
 * Les champs fournisseur_id, utilisateur_id, numero_commande sont
 * INTERDITS à la modification.
 */
class UpdateAchatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

public function rules(): array
{
    return [
        // Champs modifiables
        'fournisseur_id'         => ['sometimes', 'integer', 'exists:fournisseurs,id'],
        'numero_commande'        => ['sometimes', 'string', 'max:50'],
        'date_commande'          => ['sometimes', 'date'],
        'date_livraison_prevue'  => ['nullable', 'date'],
        'statut'                 => ['sometimes', 'in:brouillon,envoyee,partiellement_livree,livree,annulee'],
        'notes'                  => ['nullable', 'string', 'max:2000'],

        // Lignes de commande (modifiables uniquement en brouillon — logique métier dans le controller)
        'lignes'                          => ['sometimes', 'array', 'min:1'],
        'lignes.*.medicament_id'          => ['required_with:lignes', 'integer', 'exists:medicaments,id'],
        'lignes.*.quantite_commandee'     => ['required_with:lignes', 'integer', 'min:1'],
        'lignes.*.prix_achat_ht_unitaire' => ['required_with:lignes', 'numeric', 'min:0'],
        'lignes.*.taux_tva'               => ['nullable', 'numeric', 'min:0', 'max:100'],
    ];
}

    public function messages(): array
    {
        return [
            'date_livraison_prevue.date'             => 'La date de livraison doit être une date valide.',
            'lignes.min'                             => 'La commande doit contenir au moins un médicament.',
            'lignes.*.medicament_id.required_with'   => 'Le médicament est obligatoire sur chaque ligne.',
            'lignes.*.quantite_commandee.min'        => 'La quantité doit être au moins 1.',
        ];
    }
}