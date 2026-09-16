<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Modèle User — Utilisateur du système.
 *
 * Rôles : Administrateur, Pharmacien, Vendeur.
 * Le mot de passe est haché en Argon2id (configuré dans .env).
 */
class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'nom',
        'prenom',
        'email',
        'password',
        'role',
        'actif',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at'    => 'datetime',
        'date_de_creation'     => 'datetime',
        'derniere_connexion'   => 'datetime',
        'password'             => 'hashed',
        'actif'                => 'boolean',
    ];

    // === RELATIONS ===

    /** Ventes réalisées par cet utilisateur (caissier). */
    public function ventes(): HasMany
    {
        return $this->hasMany(Vente::class, 'utilisateur_id');
    }

    /** Commandes d'achat passées par cet utilisateur. */
    public function achats(): HasMany
    {
        return $this->hasMany(Achat::class, 'utilisateur_id');
    }

    /** Réceptions enregistrées par cet utilisateur. */
    public function receptions(): HasMany
    {
        return $this->hasMany(Reception::class, 'utilisateur_id');
    }

    /** Mouvements de stock effectués par cet utilisateur. */
    public function mouvementsStock(): HasMany
    {
        return $this->hasMany(MouvementStock::class, 'utilisateur_id');
    }

    /** Logs liés à cet utilisateur. */
    public function logs(): HasMany
    {
        return $this->hasMany(Log::class, 'utilisateur_id');
    }

    // === HELPERS ===

    /** Vérifie si l'utilisateur a un rôle donné. */
    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    /** Vérifie si l'utilisateur est administrateur. */
    public function isAdmin(): bool
    {
        return $this->role === 'Administrateur';
    }

    /** Vérifie si l'utilisateur est pharmacien. */
    public function isPharmacien(): bool
    {
        return $this->role === 'Pharmacien';
    }

    /** Vérifie si l'utilisateur est vendeur. */
    public function isVendeur(): bool
    {
        return $this->role === 'Vendeur';
    }
}