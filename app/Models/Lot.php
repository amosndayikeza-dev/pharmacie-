<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modèle Lot — Lot physique de médicaments (cœur du FEFO).
 */
class Lot extends Model
{
    protected $fillable = [
        'medicament_id', 'fournisseur_id',
        'numero_lot', 'date_peremption', 'date_fabrication',
        'prix_achat_ht_unitaire', 'quantite_initiale', 'quantite_restante',
    ];

    protected $casts = [
        'date_peremption'        => 'date',
        'date_fabrication'       => 'date',
        'prix_achat_ht_unitaire' => 'decimal:2',
    ];

    // === RELATIONS ===

    public function medicament(): BelongsTo
    {
        return $this->belongsTo(Medicament::class);
    }

    public function fournisseur(): BelongsTo
    {
        return $this->belongsTo(Fournisseur::class);
    }

    public function ligneVentes(): HasMany
    {
        return $this->hasMany(LigneVente::class);
    }

    public function mouvementsStock(): HasMany
    {
        return $this->hasMany(MouvementStock::class);
    }

    // === SCOPES ===

    /**
     * Scope FEFO : lots dispo triés par péremption croissante.
     * Usage : Lot::fefo($medicamentId)->get();
     */
    public function scopeFefo($query, int $medicamentId)
    {
        return $query->where('medicament_id', $medicamentId)
                     ->where('quantite_restante', '>', 0)
                     ->where('date_peremption', '>=', now())
                     ->orderBy('date_peremption', 'asc');
    }

    public function scopeExpirantDans($query, int $jours)
    {
        return $query->whereBetween('date_peremption', [
            now(), now()->addDays($jours),
        ])->where('quantite_restante', '>', 0);
    }

    public function scopePerimes($query)
    {
        return $query->where('date_peremption', '<', now())
                     ->where('quantite_restante', '>', 0);
    }

    // === HELPERS ===

    public function estPerime(): bool
    {
        return $this->date_peremption->isPast();
    }

    public function joursAvantPeremption(): int
    {
        return (int) now()->diffInDays($this->date_peremption, false);
    }
}