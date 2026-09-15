<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lot extends Model
{
    protected $fillable = [
        'medicament_id',
        'fournisseur_id',
        'numero_lot',
        'date_peremption',
        'prix_achat_ht_unitaire',
        'quantite_restante',
    ];

    protected $casts = [
        'date_peremption' => 'date',
    ];

    /**
     * Le médicament associé à ce lot.
     */
    public function medicament(): BelongsTo
    {
        return $this->belongsTo(Medicament::class);
    }

    /**
     * Le fournisseur qui a livré ce lot.
     */
    public function fournisseur(): BelongsTo
    {
        return $this->belongsTo(Fournisseur::class);
    }

    /**
     * Scope FEFO : lots disponibles triés par péremption croissante.
     * Utilisation : Lot::fefo($medicamentId)->first();
     */
    public function scopeFefo($query, int $medicamentId)
    {
        return $query->where('medicament_id', $medicamentId)
                     ->where('quantite_restante', '>', 0)
                     ->where('date_peremption', '>=', now())
                     ->orderBy('date_peremption');
    }

    /**
     * Alerte : lots qui expirent dans X jours.
     * Utilisation : Lot::expirantDans(30)->get();
     */
    public function scopeExpirantDans($query, int $jours)
    {
        return $query->whereBetween('date_peremption', [
            now(),
            now()->addDays($jours),
        ])->where('quantite_restante', '>', 0);
    }
}