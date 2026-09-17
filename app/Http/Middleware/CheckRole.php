<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware RBAC (Role-Based Access Control) pour les routes Web.
 *
 * Vérifie que l'utilisateur connecté possède l'un des rôles autorisés.
 * Contrairement à la version API, ce middleware REDIRIGE vers une page
 * en cas d'accès refusé (au lieu de retourner du JSON).
 *
 * Rôles disponibles : Administrateur, Pharmacien, Vendeur.
 *
 * USAGE DANS LES ROUTES :
 *   Route::middleware(['auth', 'role:Administrateur'])->group(...);
 *   Route::middleware(['auth', 'role:Administrateur,Pharmacien'])->group(...);
 */
class CheckRole
{
    /**
     * Traite la requête entrante.
     *
     * @param  Request  $request
     * @param  Closure  $next
     * @param  string   ...$roles  Un ou plusieurs rôles autorisés
     * @return Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // 1. Vérifier qu'un utilisateur est connecté
        $user = $request->user();

        if (! $user) {
            // Pas connecté : rediriger vers la page de connexion
            return redirect()->route('login')
                ->with('error', 'Vous devez être connecté pour accéder à cette page.');
        }

        // 2. Vérifier que le compte est actif
        if (! $user->actif) {
            // Compte désactivé : déconnecter et rediriger
            auth()->logout();

            return redirect()->route('login')
                ->with('error', 'Votre compte a été désactivé. Contactez l\'administrateur.');
        }

        // 3. Vérifier le rôle
        //    Si aucun rôle n'est spécifié, on laisse passer (auth suffit)
        //    Sinon, l'utilisateur doit avoir l'un des rôles listés
        if (! empty($roles) && ! in_array($user->role, $roles, true)) {
            // Accès refusé : rediriger vers le dashboard avec un message
            return redirect()->route('dashboard')
                ->with('error', 'Accès refusé. Vous n\'avez pas les permissions nécessaires.');
        }

        // 4. Tout est OK : continuer
        return $next($request);
    }
}