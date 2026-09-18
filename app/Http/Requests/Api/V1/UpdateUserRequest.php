<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Validation pour la modification d'un utilisateur.
 */
class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('id') ?? $this->route('user');
        if (is_object($userId)) $userId = $userId->id;

        return [
            'nom'      => ['sometimes', 'required', 'string', 'max:100'],
            'prenom'   => ['sometimes', 'required', 'string', 'max:100'],
            'email'    => [
                'sometimes', 'required', 'email', 'max:150',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'password' => ['sometimes', 'nullable', 'confirmed', Password::min(8)],
            'role'     => ['sometimes', 'required', 'in:Administrateur,Pharmacien,Vendeur'],
            'actif'    => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nom.required'       => 'Le nom est obligatoire.',
            'prenom.required'    => 'Le prénom est obligatoire.',
            'email.unique'       => 'Cet email est déjà utilisé par un autre utilisateur.',
            'password.confirmed' => 'Les mots de passe ne correspondent pas.',
            'role.in'            => 'Rôle invalide.',
        ];
    }
}