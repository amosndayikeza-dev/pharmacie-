<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modèle Vente — En-tête de vente.
 *
 * INSERT-ONLY : une vente n'est jamais modifiée ni supprimée.
 * En cas d'erreur, créer une vente de contrepartie (avoir).
 */
class Vente extends Model
{
    protected $fillable = [
        'numero_ticket',
        'patient_id',
        'utilisateur_id',
        'ordonnance_id',
        'date_heure',
        'montant_total_ht',
        'montant_total_tva',
        'montant_total_ttc',
        'montant_remise',
        'statut',
    ];

    protected $casts = [
        'date_heure'        => 'datetime',
        'montant_total_ht'  => 'decimal:2',
        'montant_total_tva' => 'decimal:2',
        'montant_total_ttc' => 'decimal:2',
        'montant_remise'    => 'decimal:2',
    ];

    // === RELATIONS ===

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function ordonnance(): BelongsTo
    {
        return $this->belongsTo(Ordonnance::class);
    }

    /** Lignes de la vente. */
    public function lignes(): HasMany
    {
        return $this->hasMany(LigneVente::class);
    }

    /** Paiements associés. */
    public function paiements(): HasMany
    {
        return $this->hasMany(Paiement::class);
    }

    // === HELPERS ===

    /** Montant total déjà payé. */
    public function montantPaye(): float
    {
        return (float) $this->paiements()->sum('montant');
    }

    /** Reste à payer. */
    public function resteAPayer(): float
    {
        return (float) $this->montant_total_ttc - $this->montantPaye();
    }

    /** Vente entièrement payée ? */
    public function estSoldee(): bool
    {
        return $this->resteAPayer() <= 0.01;
    }
}