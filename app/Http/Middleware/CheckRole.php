<?php

namespace App\Http\Middleware\Api;

use Closure;
use Illuminate\Http\Request;

/**
 * Middleware RBAC pour API.
 *
 * Retourne du JSON (401 / 403) au lieu de rediriger.
 *
 * Usage : Route::middleware('role.api:Administrateur')
 */
class CheckRoleApi
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Non authentifié.',
            ], 401);
        }

        if (! $user->actif) {
            return response()->json([
                'message' => 'Compte désactivé.',
            ], 403);
        }

        if (! empty($roles) && ! in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => 'Accès refusé. Rôle requis : ' . implode(' ou ', $roles),
                'votre_role' => $user->role,
            ], 403);
        }

        return $next($request);
    }
}