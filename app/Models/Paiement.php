<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle Paiement — Paiement d'une vente (multi-paiements).
 *
 * Vétérinaire : especes, carte, mobile_money, credit.
 */
class Paiement extends Model
{
    protected $fillable = [
        'vente_id', 'type', 'montant', 'reference_externe',
    ];

    protected $casts = [
        'montant' => 'decimal:2',
    ];

    // === RELATIONS ===

    public function vente(): BelongsTo
    {
        return $this->belongsTo(Vente::class);
    }

    // === HELPERS ===

    public function libelle(): string
    {
        return match ($this->type) {
            'especes'      => 'Espèces',
            'carte'        => 'Carte bancaire',
            'mobile_money' => 'Mobile Money',
            'credit'       => 'Crédit',
            default        => 'Inconnu',
        };
    }

    /**
 * Règlements encaissés contre ce paiement crédit.
 */
    public function reglements()
    {
        return $this->hasMany(ReglementCredit::class, 'paiement_id');
    }

    /**
     * Montant déjà réglé sur ce crédit.
     */
    public function montantRegle(): float
    {
        return (float) $this->reglements()->sum('montant');
    }

    /**
     * Reste à payer sur ce crédit.
     */
    public function resteAPayer(): float
    {
        if ($this->type !== 'credit') return 0;

        return (float) $this->montant - $this->montantRegle();
    }

    /**
     * Le crédit est-il soldé ?
     */
    public function estSolde(): bool
    {
        return $this->resteAPayer() <= 0.01;
    }
}