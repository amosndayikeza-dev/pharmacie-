<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Reception — Réception physique de marchandises.
 *
 * Une réception crée des lots physiques via ses lignes.
 */
class Reception extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'numero_reception',
        'achat_id',
        'fournisseur_id',
        'utilisateur_id',
        'date_reception',
        'numero_bon_livraison',
        'montant_total_ht',
        'montant_total_tva',
        'montant_total_ttc',
        'statut',
        'observations',
    ];

    protected $casts = [
        'date_reception'    => 'date',
        'montant_total_ht'  => 'decimal:2',
        'montant_total_tva' => 'decimal:2',
        'montant_total_ttc' => 'decimal:2',
    ];

    // === RELATIONS ===

    public function achat(): BelongsTo
    {
        return $this->belongsTo(Achat::class);
    }

    public function fournisseur(): BelongsTo
    {
        return $this->belongsTo(Fournisseur::class);
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function lignes(): HasMany
    {
        return $this->hasMany(LigneReception::class);
    }
}