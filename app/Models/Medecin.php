<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Medecin — Médecin prescripteur.
 */
class Medecin extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nom',
        'prenom',
        'numero_rpps',
        'specialite',
        'telephone',
        'email',
        'adresse_cabinet',
        'actif',
    ];

    protected $casts = [
        'actif' => 'boolean',
    ];

    // === RELATIONS ===

    /** Ordonnances rédigées par ce médecin. */
    public function ordonnances(): HasMany
    {
        return $this->hasMany(Ordonnance::class);
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