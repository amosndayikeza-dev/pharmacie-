<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modèle Vente — En-tête de vente.
 *
 * client = propriétaire, patient = animal.
 */
class Vente extends Model
{
    protected $fillable = [
        'numero_ticket',
        'proprietaire_id', 'animal_id',
        'utilisateur_id', 'ordonnance_id',
        'date_heure',
        'montant_total_ht', 'montant_total_tva', 'montant_total_ttc',
        'montant_remise', 'statut',
    ];

    protected $casts = [
        'date_heure'        => 'datetime',
        'montant_total_ht'  => 'decimal:2',
        'montant_total_tva' => 'decimal:2',
        'montant_total_ttc' => 'decimal:2',
        'montant_remise'    => 'decimal:2',
    ];

    // === RELATIONS ===

    public function proprietaire(): BelongsTo
    {
        return $this->belongsTo(Proprietaire::class);
    }

    public function animal(): BelongsTo
    {
        return $this->belongsTo(Animal::class);
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function ordonnance(): BelongsTo
    {
        return $this->belongsTo(Ordonnance::class);
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(LigneVente::class);
    }

    public function paiements(): HasMany
    {
        return $this->hasMany(Paiement::class);
    }

    // === HELPERS ===

    public function montantPaye(): float
    {
        return (float) $this->paiements()->sum('montant');
    }

    public function resteAPayer(): float
    {
        return (float) $this->montant_total_ttc - $this->montantPaye();
    }

    public function estSoldee(): bool
    {
        return $this->resteAPayer() <= 0.01;
    }
}