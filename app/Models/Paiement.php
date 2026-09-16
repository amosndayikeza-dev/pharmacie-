<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle Paiement — Paiement d'une vente (multi-paiements possibles).
 */
class Paiement extends Model
{
    protected $fillable = [
        'vente_id',
        'type',
        'montant',
        'reference_externe',
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

    /** Libellé lisible du type de paiement. */
    public function libelle(): string
    {
        return match ($this->type) {
            'especes'  => 'Espèces',
            'carte'    => 'Carte bancaire',
            'secu'     => 'Sécurité sociale',
            'mutuelle' => 'Mutuelle',
            'credit'   => 'Crédit',
            default    => 'Inconnu',
        };
    }
}