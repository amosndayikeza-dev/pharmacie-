<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle LigneReception — Ligne de réception (= un lot physique).
 */
class LigneReception extends Model
{
    protected $table = 'ligne_receptions';

    protected $fillable = [
        'reception_id',
        'ligne_achat_id',
        'medicament_id',
        'numero_lot',
        'date_peremption',
        'date_fabrication',
        'quantite_recue',
        'prix_achat_ht_unitaire',
        'taux_tva',
        'montant_ht',
        'montant_ttc',
    ];

    protected $casts = [
        'date_peremption'        => 'date',
        'date_fabrication'       => 'date',
        'prix_achat_ht_unitaire' => 'decimal:2',
        'taux_tva'               => 'decimal:2',
        'montant_ht'             => 'decimal:2',
        'montant_ttc'            => 'decimal:2',
    ];

    // === RELATIONS ===

    public function reception(): BelongsTo
    {
        return $this->belongsTo(Reception::class);
    }

    public function ligneAchat(): BelongsTo
    {
        return $this->belongsTo(LigneAchat::class);
    }

    public function medicament(): BelongsTo
    {
        return $this->belongsTo(Medicament::class);
    }
}