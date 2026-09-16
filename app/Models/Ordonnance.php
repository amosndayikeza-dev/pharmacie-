<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Ordonnance — Ordonnance médicale.
 */
class Ordonnance extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'patient_id',
        'medecin_id',
        'numero_ordonnance',
        'date_prescription',
        'date_fin_validite',
        'fichier_scan',
        'observations',
    ];

    protected $casts = [
        'date_prescription' => 'date',
        'date_fin_validite' => 'date',
    ];

    // === RELATIONS ===

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function medecin(): BelongsTo
    {
        return $this->belongsTo(Medecin::class);
    }

    /** Ventes liées à cette ordonnance. */
    public function ventes(): HasMany
    {
        return $this->hasMany(Vente::class);
    }

    // === HELPERS ===

    /** Vérifie si l'ordonnance est encore valide. */
    public function estValide(): bool
    {
        if (! $this->date_fin_validite) {
            return true;
        }

        return $this->date_fin_validite->isFuture();
    }
}