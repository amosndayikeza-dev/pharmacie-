<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreUserRequest;
use App\Http\Requests\Api\V1\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;

/**
 * Controller API des utilisateurs.
 *
 * ⚠️ Accès réservé aux Administrateurs (via middleware role.api).
 * Exception : me() et changePassword() sont accessibles à tout utilisateur connecté.
 */
class UserController extends Controller
{
    /**
     * Liste paginée des utilisateurs.
     *
     * GET /api/v1/users
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $users = User::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = $request->search;
                $q->where(function ($sub) use ($s) {
                    $sub->where('nom', 'like', "%{$s}%")
                        ->orWhere('prenom', 'like', "%{$s}%")
                        ->orWhere('email', 'like', "%{$s}%");
                });
            })
            ->when($request->filled('role'), fn ($q) =>
                $q->where('role', $request->role)
            )
            ->when($request->has('actif'), fn ($q) =>
                $q->where('actif', $request->boolean('actif'))
            )
            ->orderBy('nom')
            ->orderBy('prenom')
            ->paginate($request->input('per_page', 20));

        return UserResource::collection($users);
    }

    /**
     * Détail d'un utilisateur.
     *
     * GET /api/v1/users/{id}
     */
    public function show(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    /**
     * Créer un utilisateur.
     *
     * POST /api/v1/users
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create([
            'nom'      => $request->nom,
            'prenom'   => $request->prenom,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => $request->role,
            'actif'    => $request->input('actif', true),
        ]);

        return response()->json([
            'message' => 'Utilisateur créé avec succès.',
            'data'    => new UserResource($user),
        ], 201);
    }

    /**
     * Modifier un utilisateur.
     *
     * PUT/PATCH /api/v1/users/{id}
     */
    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $data = $request->safe()->except(['password']);

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json([
            'message' => 'Utilisateur modifié avec succès.',
            'data'    => new UserResource($user->fresh()),
        ]);
    }

    /**
     * Désactiver un utilisateur (pas de suppression physique).
     *
     * DELETE /api/v1/users/{id}
     *
     * On ne supprime JAMAIS un utilisateur : les ventes et logs y font référence.
     */
    public function destroy(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // Empêcher l'auto-désactivation
        if ($user->id === Auth::id()) {
            return response()->json([
                'message' => 'Vous ne pouvez pas désactiver votre propre compte.',
            ], 409);
        }

        $user->update(['actif' => false]);

        return response()->json([
            'message' => 'Utilisateur désactivé.',
            'data'    => new UserResource($user),
        ]);
    }

    // ============================================================
    // MÉTHODES SPÉCIALES
    // ============================================================

    /**
     * Activer / désactiver un utilisateur.
     *
     * POST /api/v1/users/{id}/toggle-actif
     */
    public function toggleActif(int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === Auth::id()) {
            return response()->json([
                'message' => 'Vous ne pouvez pas désactiver votre propre compte.',
            ], 409);
        }

        $user->update(['actif' => ! $user->actif]);

        return response()->json([
            'message' => $user->actif ? 'Utilisateur activé.' : 'Utilisateur désactivé.',
            'data'    => new UserResource($user),
        ]);
    }

    /**
     * Réinitialiser le mot de passe d'un utilisateur (par l'admin).
     *
     * POST /api/v1/users/{id}/reset-password
     * Body: { password, password_confirmation }
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'confirmed', 'min:8'],
        ]);

        $user = User::findOrFail($id);
        $user->update(['password' => Hash::make($request->password)]);

        // Révoquer tous les tokens de l'utilisateur (déconnexion forcée)
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Mot de passe réinitialisé. L\'utilisateur doit se reconnecter.',
        ]);
    }

    /**
     * Profil de l'utilisateur connecté.
     *
     * GET /api/v1/me
     * (Déjà défini dans AuthController, mais on le remet ici pour référence)
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }

    /**
     * Changer son propre mot de passe.
     *
     * POST /api/v1/me/change-password
     * Body: { current_password, password, password_confirmation }
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'confirmed', 'min:8'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'Le mot de passe actuel est incorrect.',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Révoquer tous les autres tokens sauf le courant
        $currentTokenId = $user->currentAccessToken()->id;
        $user->tokens()->where('id', '!=', $currentTokenId)->delete();

        return response()->json([
            'message' => 'Mot de passe modifié avec succès.',
        ]);
    }
}