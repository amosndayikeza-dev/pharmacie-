<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation pour la création d'une commande d'achat (API).
 *
 * ⚠️ L'utilisateur_id n'est PAS dans les rules : il est récupéré
 *    automatiquement depuis l'utilisateur connecté (auth()->id()).
 *
 * ⚠️ Le statut est forcé à 'brouillon' à la création.
 */
class StoreAchatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fournisseur_id'         => ['required', 'integer', 'exists:fournisseurs,id'],
            'date_commande'          => ['required', 'date'],
            'date_livraison_prevue'  => ['nullable', 'date', 'after_or_equal:date_commande'],
            'notes'                  => ['nullable', 'string'],

            // Lignes de la commande (au moins 1)
            'lignes'                          => ['required', 'array', 'min:1'],
            'lignes.*.medicament_id'          => ['required', 'integer', 'exists:medicaments,id'],
            'lignes.*.quantite_commandee'     => ['required', 'integer', 'min:1'],
            'lignes.*.prix_achat_ht_unitaire' => ['required', 'numeric', 'min:0'],
            'lignes.*.taux_tva'               => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'fournisseur_id.required'                => 'Le fournisseur est obligatoire.',
            'fournisseur_id.exists'                  => 'Ce fournisseur n\'existe pas.',
            'date_commande.required'                 => 'La date de commande est obligatoire.',
            'date_livraison_prevue.after_or_equal'   => 'La date de livraison doit être après la date de commande.',
            'lignes.required'                        => 'La commande doit contenir au moins une ligne.',
            'lignes.min'                             => 'La commande doit contenir au moins un médicament.',
            'lignes.*.medicament_id.required'        => 'Le médicament est obligatoire sur chaque ligne.',
            'lignes.*.medicament_id.exists'          => 'Un des médicaments n\'existe pas.',
            'lignes.*.quantite_commandee.required'   => 'La quantité est obligatoire.',
            'lignes.*.quantite_commandee.min'        => 'La quantité doit être au moins 1.',
            'lignes.*.prix_achat_ht_unitaire.required' => 'Le prix d\'achat est obligatoire.',
            'lignes.*.prix_achat_ht_unitaire.numeric'  => 'Le prix d\'achat doit être un nombre.',
        ];
    }
}