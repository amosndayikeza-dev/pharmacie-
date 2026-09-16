<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle Vaccination — Suivi des vaccinations des animaux.
 */
class Vaccination extends Model
{
    protected $fillable = [
        'animal_id', 'veterinaire_id', 'medicament_id',
        'nom_vaccin', 'numero_lot_vaccin',
        'date_vaccination', 'date_prochain_rappel',
        'observations', 'reaction',
    ];

    protected $casts = [
        'date_vaccination'    => 'date',
        'date_prochain_rappel' => 'date',
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

    public function medicament(): BelongsTo
    {
        return $this->belongsTo(Medicament::class);
    }

    // === HELPERS ===

    /** Vrai si un rappel est à prévoir dans moins de X jours. */
    public function rappelProche(int $jours = 30): bool
    {
        if (! $this->date_prochain_rappel) {
            return false;
        }

        return $this->date_prochain_rappel->isFuture()
            && $this->date_prochain_rappel->diffInDays(now()) <= $jours;
    }

    public function rappelEnRetard(): bool
    {
        return $this->date_prochain_rappel?->isPast() ?? false;
    }

    // === SCOPES ===

    public function scopeARappelProche($query, int $jours = 30)
    {
        return $query->whereBetween('date_prochain_rappel', [
            now(), now()->addDays($jours),
        ]);
    }

    public function scopeEnRetard($query)
    {
        return $query->where('date_prochain_rappel', '<', now());
    }
}