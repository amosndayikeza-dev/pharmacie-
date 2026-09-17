<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LoginRequest;
use App\Http\Requests\Api\V1\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Contrôleur d'authentification API.
 *
 * Utilise Laravel Sanctum pour générer des tokens Bearer.
 * Le frontend stocke le token et l'envoie dans le header :
 *   Authorization: Bearer <token>
 */
class AuthController extends Controller
{
    /**
     * Connexion d'un utilisateur.
     *
     * POST /api/v1/login
     * Body: { email, password }
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        // Vérification des identifiants
        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Les identifiants sont incorrects.'],
            ]);
        }

        // Vérification du compte actif
        if (! $user->actif) {
            return response()->json([
                'message' => 'Votre compte a été désactivé. Contactez l\'administrateur.',
            ], 403);
        }

        // Révoquer les anciens tokens (sécurité : 1 seule session à la fois)
        $user->tokens()->delete();

        // Créer un nouveau token
        $token = $user->createToken('auth-token')->plainTextToken;

        // Mettre à jour la dernière connexion
        $user->update(['derniere_connexion' => now()]);

        return response()->json([
            'message' => 'Connexion réussie.',
            'user'    => [
                'id'          => $user->id,
                'nom'         => $user->nom,
                'prenom'      => $user->prenom,
                'nom_complet' => $user->nomComplet(),
                'email'       => $user->email,
                'role'        => $user->role,
            ],
            'token'      => $token,
            'token_type' => 'Bearer',
        ]);
    }

    /**
     * Inscription d'un nouvel utilisateur.
     *
     * POST /api/v1/register
     * Body: { nom, prenom, email, password, password_confirmation }
     *
     * ⚠️ En production : désactiver cette route ou la protéger.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'nom'      => $request->nom,
            'prenom'   => $request->prenom,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => $request->input('role', 'Vendeur'),
            'actif'    => true,
        ]);

        // Créer un token
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Compte créé avec succès.',
            'user'    => [
                'id'          => $user->id,
                'nom'         => $user->nom,
                'prenom'      => $user->prenom,
                'nom_complet' => $user->nomComplet(),
                'email'       => $user->email,
                'role'        => $user->role,
            ],
            'token'      => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /**
     * Récupérer l'utilisateur connecté.
     *
     * GET /api/v1/me
     * Header: Authorization: Bearer <token>
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id'                 => $user->id,
                'nom'                => $user->nom,
                'prenom'             => $user->prenom,
                'nom_complet'        => $user->nomComplet(),
                'email'              => $user->email,
                'role'               => $user->role,
                'actif'              => $user->actif,
                'derniere_connexion' => $user->derniere_connexion?->toISOString(),
                'date_de_creation'   => $user->date_de_creation?->toISOString(),
            ],
        ]);
    }

    /**
     * Déconnexion (révoque le token actuel).
     *
     * POST /api/v1/logout
     * Header: Authorization: Bearer <token>
     */
    public function logout(Request $request): JsonResponse
    {
        // Révoquer le token utilisé pour cette requête
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Déconnexion réussie.',
        ]);
    }

    /**
     * Déconnexion totale (révoque TOUS les tokens de l'utilisateur).
     *
     * POST /api/v1/logout-all
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Déconnecté de tous les appareils.',
        ]);
    }

    /**
     * Rafraîchir le token (révoque l'ancien, en crée un nouveau).
     *
     * POST /api/v1/refresh
     * Header: Authorization: Bearer <token>
     */
    public function refresh(Request $request): JsonResponse
    {
        $user = $request->user();

        // Révoquer tous les tokens
        $user->tokens()->delete();

        // Créer un nouveau token
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message'    => 'Token rafraîchi.',
            'token'      => $token,
            'token_type' => 'Bearer',
        ]);
    }
}