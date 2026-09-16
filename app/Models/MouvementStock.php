<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle MouvementStock — Journal des mouvements (AUDIT).
 *
 * INSERT-ONLY : aucun mouvement n'est modifié ni supprimé.
 */
class MouvementStock extends Model
{
    protected $table = 'mouvements_stock';

    protected $fillable = [
        'lot_id',
        'date_heure',
        'quantite',
        'type',
        'reference_id',
        'reference_type',
        'utilisateur_id',
        'motif',
    ];

    protected $casts = [
        'date_heure' => 'datetime',
        'quantite'   => 'integer',
    ];

    /**
     * PROTECTION : insert-only.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new \RuntimeException(
                'Un mouvement de stock est immuable (insert-only).'
            );
        });

        static::deleting(function () {
            throw new \RuntimeException(
                'Un mouvement de stock ne peut pas être supprimé.'
            );
        });
    }

    // === RELATIONS ===

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    // === HELPERS ===

    public function estEntree(): bool
    {
        return $this->quantite > 0;
    }

    public function estSortie(): bool
    {
        return $this->quantite < 0;
    }
}