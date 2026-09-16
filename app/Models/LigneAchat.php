<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle LigneAchat — Ligne de commande d'achat.
 */
class LigneAchat extends Model
{
    protected $table = 'ligne_achats';

    protected $fillable = [
        'achat_id',
        'medicament_id',
        'quantite_commandee',
        'quantite_recue',
        'prix_achat_ht_unitaire',
        'taux_tva',
        'montant_ht',
        'montant_ttc',
    ];

    protected $casts = [
        'prix_achat_ht_unitaire' => 'decimal:2',
        'taux_tva'               => 'decimal:2',
        'montant_ht'             => 'decimal:2',
        'montant_ttc'            => 'decimal:2',
    ];

    // === RELATIONS ===

    public function achat(): BelongsTo
    {
        return $this->belongsTo(Achat::class);
    }

    public function medicament(): BelongsTo
    {
        return $this->belongsTo(Medicament::class);
    }

    // === HELPERS ===

    /** Quantité restant à recevoir. */
    public function quantiteRestante(): int
    {
        return $this->quantite_commandee - $this->quantite_recue;
    }

    /** Ligne entièrement reçue ? */
    public function estEntierementRecue(): bool
    {
        return $this->quantite_recue >= $this->quantite_commandee;
    }
}