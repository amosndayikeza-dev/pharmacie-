<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
/**
 * Modèle User — Utilisateur du système.
 *
 * Rôles : Administrateur, Pharmacien, Vendeur.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'nom', 'prenom', 'email', 'password', 'role', 'actif',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at'  => 'datetime',
        'date_de_creation'   => 'datetime',
        'derniere_connexion' => 'datetime',
        'password'           => 'hashed',
        'actif'              => 'boolean',
    ];

    // === RELATIONS ===

    public function ventes(): HasMany
    {
        return $this->hasMany(Vente::class, 'utilisateur_id');
    }

    public function achats(): HasMany
    {
        return $this->hasMany(Achat::class, 'utilisateur_id');
    }

    public function receptions(): HasMany
    {
        return $this->hasMany(Reception::class, 'utilisateur_id');
    }

    public function mouvementsStock(): HasMany
    {
        return $this->hasMany(MouvementStock::class, 'utilisateur_id');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(Log::class, 'utilisateur_id');
    }

    // === HELPERS ===

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function isAdmin(): bool
    {
        return $this->role === 'Administrateur';
    }

    public function isPharmacien(): bool
    {
        return $this->role === 'Pharmacien';
    }

    public function isVendeur(): bool
    {
        return $this->role === 'Vendeur';
    }
}