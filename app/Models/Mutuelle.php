<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Mutuelle — Mutuelle / assurance santé.
 *
 * Utilisée pour le tiers-payant.
 */
class Mutuelle extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nom',
        'code',
        'telephone',
        'email',
        'adresse',
        'taux_prise_en_charge',
        'plafond_annuel',
        'actif',
    ];

    protected $casts = [
        'taux_prise_en_charge' => 'decimal:2',
        'plafond_annuel'       => 'decimal:2',
        'actif'                => 'boolean',
    ];

    // === RELATIONS ===

    /** Patients affiliés à cette mutuelle. */
    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    // === SCOPES ===

    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }
}