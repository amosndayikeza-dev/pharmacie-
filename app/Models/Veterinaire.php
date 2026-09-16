<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Veterinaire — Vétérinaire prescripteur.
 */
class Veterinaire extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nom', 'prenom', 'numero_ordre', 'specialite',
        'telephone', 'email', 'adresse_cabinet', 'actif',
    ];

    protected $casts = [
        'actif' => 'boolean',
    ];

    // === RELATIONS ===

    public function ordonnances(): HasMany
    {
        return $this->hasMany(Ordonnance::class);
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(Vaccination::class);
    }

    // === HELPERS ===

    public function nomComplet(): string
    {
        return trim("Dr {$this->prenom} {$this->nom}");
    }

    // === SCOPES ===

    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }
}