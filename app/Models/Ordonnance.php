<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Ordonnance — Ordonnance vétérinaire.
 */
class Ordonnance extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'animal_id', 'veterinaire_id',
        'numero_ordonnance', 'date_prescription', 'date_fin_validite',
        'fichier_scan', 'diagnostic', 'observations',
    ];

    protected $casts = [
        'date_prescription' => 'date',
        'date_fin_validite' => 'date',
    ];

    // === RELATIONS ===

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function veterinaire(): BelongsTo
    {
        return $this->belongsTo(Veterinaire::class);
    }

    public function ventes(): HasMany
    {
        return $this->hasMany(Vente::class);
    }

    // === HELPERS ===

    public function estValide(): bool
    {
        if (! $this->date_fin_validite) {
            return true;
        }

        return $this->date_fin_validite->isFuture();
    }
}