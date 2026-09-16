<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Fournisseur — Fournisseur de médicaments vétérinaires.
 */
class Fournisseur extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nom', 'raison_sociale', 'numero_contribuable',
        'telephone', 'email', 'adresse', 'ville', 'pays',
        'delai_livraison_jours', 'notes', 'actif',
    ];

    protected $casts = [
        'actif' => 'boolean',
    ];

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }

    public function achats(): HasMany
    {
        return $this->hasMany(Achat::class);
    }

    public function receptions(): HasMany
    {
        return $this->hasMany(Reception::class);
    }

    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }
}