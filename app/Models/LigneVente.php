<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle LigneVente — Ligne de vente.
 *
 * PRINCIPE DU COÛT FIGÉ :
 *   prix_vente_ttc_unitaire, prix_achat_ht_unitaire_fige et taux_tva
 *   sont IMMUABLES. Ils reflètent l'état du prix au moment de la vente.
 */
class LigneVente extends Model
{
    protected $table = 'ligne_ventes';

    protected $fillable = [
        'vente_id',
        'lot_id',
        'medicament_id',
        'quantite',
        'prix_vente_ttc_unitaire',
        'prix_achat_ht_unitaire_fige',
        'taux_tva',
        'montant_ht',
        'montant_tva',
        'montant_ttc',
        'marge_brute',
    ];

    protected $casts = [
        'prix_vente_ttc_unitaire'      => 'decimal:2',
        'prix_achat_ht_unitaire_fige'  => 'decimal:2',
        'taux_tva'                     => 'decimal:2',
        'montant_ht'                   => 'decimal:2',
        'montant_tva'                  => 'decimal:2',
        'montant_ttc'                  => 'decimal:2',
        'marge_brute'                  => 'decimal:2',
    ];

    /**
     * PROTECTION : le coût d'achat figé est IMMUABLE.
     * Toute tentative de modification lève une exception.
     */
    protected static function booted(): void
    {
        static::updating(function (LigneVente $ligne) {
            if ($ligne->isDirty('prix_achat_ht_unitaire_fige')) {
                throw new \RuntimeException(
                    'Le coût d\'achat figé est immuable (règle CDC).'
                );
            }
        });

        static::deleting(function () {
            throw new \RuntimeException(
                'Une ligne de vente ne peut pas être supprimée (insert-only).'
            );
        });
    }

    // === RELATIONS ===

    public function vente(): BelongsTo
    {
        return $this->belongsTo(Vente::class);
    }

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function medicament(): BelongsTo
    {
        return $this->belongsTo(Medicament::class);
    }
}