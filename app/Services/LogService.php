<?php

namespace App\Services;

use App\Models\Log;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * Service de journalisation (audit RGPD).
 *
 * Utilisation :
 *   LogService::log('creation_vente', 'ventes', $vente, null, $vente->toArray());
 *   LogService::connexion($user->id);
 *   LogService::deconnexion($user->id);
 */
class LogService
{
    public static function log(
        string $action,
        string $module,
        ?Model $entite = null,
        ?array $donneesAvant = null,
        ?array $donneesApres = null,
    ): Log {
        return Log::create([
            'utilisateur_id' => Auth::id(),
            'action'         => $action,
            'module'         => $module,
            'entite_type'    => $entite ? get_class($entite) : null,
            'entite_id'      => $entite?->getKey(),
            'donnees_avant'  => $donneesAvant,
            'donnees_apres'  => $donneesApres,
            'ip_address'     => Request::ip(),
            'user_agent'     => substr((string) Request::userAgent(), 0, 255),
            'date_heure'     => now(),
        ]);
    }

    public static function connexion(int $utilisateurId): Log
    {
        return Log::create([
            'utilisateur_id' => $utilisateurId,
            'action'         => 'connexion',
            'module'         => 'auth',
            'ip_address'     => Request::ip(),
            'user_agent'     => substr((string) Request::userAgent(), 0, 255),
            'date_heure'     => now(),
        ]);
    }

    public static function deconnexion(int $utilisateurId): Log
    {
        return Log::create([
            'utilisateur_id' => $utilisateurId,
            'action'         => 'deconnexion',
            'module'         => 'auth',
            'ip_address'     => Request::ip(),
            'user_agent'     => substr((string) Request::userAgent(), 0, 255),
            'date_heure'     => now(),
        ]);
    }
}