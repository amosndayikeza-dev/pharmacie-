<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Fournisseur — Fournisseur de médicaments.
 *
 * Soft delete : on ne supprime jamais un fournisseur (RGPD + historique).
 */
class Fournisseur extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nom',
        'raison_sociale',
        'numero_contribuable',
        'telephone',
        'email',
        'adresse',
        'ville',
        'pays',
        'delai_livraison_jours',
        'notes',
        'actif',
    ];

    protected $casts = [
        'actif' => 'boolean',
    ];

    // === RELATIONS ===

    /** Lots livrés par ce fournisseur. */
    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }

    /** Commandes d'achat passées à ce fournisseur. */
    public function achats(): HasMany
    {
        return $this->hasMany(Achat::class);
    }

    /** Réceptions de ce fournisseur. */
    public function receptions(): HasMany
    {
        return $this->hasMany(Reception::class);
    }

    // === SCOPES ===

    /** Fournisseurs actifs uniquement. */
    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }
}