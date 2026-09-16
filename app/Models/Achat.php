<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Achat — Commande d'achat fournisseur.
 */
class Achat extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'numero_commande', 'fournisseur_id', 'utilisateur_id',
        'date_commande', 'date_livraison_prevue',
        'montant_total_ht', 'montant_total_tva', 'montant_total_ttc',
        'statut', 'notes',
    ];

    protected $casts = [
        'date_commande'         => 'date',
        'date_livraison_prevue' => 'date',
        'montant_total_ht'      => 'decimal:2',
        'montant_total_tva'     => 'decimal:2',
        'montant_total_ttc'     => 'decimal:2',
    ];

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
        return $this->hasMany(LigneAchat::class);
    }

    public function receptions(): HasMany
    {
        return $this->hasMany(Reception::class);
    }

    public function estEntierementRecue(): bool
    {
        foreach ($this->lignes as $ligne) {
            if ($ligne->quantite_recue < $ligne->quantite_commandee) {
                return false;
            }
        }

        return true;
    }
}