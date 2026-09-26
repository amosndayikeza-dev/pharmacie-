<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle ReglementCredit — Règlement ultérieur d'une dette client.
 */
class ReglementCredit extends Model
{
    protected $table = 'reglements_credits';
    protected $fillable = [
        'paiement_id', 'montant', 'utilisateur_id', 'mode', 'date_heure', 'notes',
    ];

    protected $casts = [
        'montant'    => 'decimal:2',
        'date_heure' => 'datetime',
    ];

    public function paiement(): BelongsTo
    {
        return $this->belongsTo(Paiement::class);
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }
}