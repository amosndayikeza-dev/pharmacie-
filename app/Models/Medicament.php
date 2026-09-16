<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Medicament — Catalogue des médicaments.
 *
 * Le stock réel est calculé à partir des lots (FEFO).
 * Soft delete : un médicament retiré reste dans l'historique des ventes.
 */
class Medicament extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code_cip',
        'code_barre',
        'nom',
        'denomination_commune',
        'forme',
        'dosage',
        'laboratoire',
        'sur_ordonnance',
        'categorie',
        'prix_vente_ttc_reference',
        'taux_tva',
        'seuil_alerte',
        'stock_max',
        'actif',
    ];

    protected $casts = [
        'prix_vente_ttc_reference' => 'decimal:2',
        'taux_tva'                 => 'decimal:2',
        'sur_ordonnance'           => 'boolean',
        'actif'                    => 'boolean',
    ];

    // === RELATIONS ===

    /** Lots de ce médicament. */
    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }

    /** Lignes de vente contenant ce médicament. */
    public function ligneVentes(): HasMany
    {
        return $this->hasMany(LigneVente::class);
    }

    /** Lignes d'achat contenant ce médicament. */
    public function ligneAchats(): HasMany
    {
        return $this->hasMany(LigneAchat::class);
    }

    /** Lignes de réception contenant ce médicament. */
    public function ligneReceptions(): HasMany
    {
        return $this->hasMany(LigneReception::class);
    }

    // === HELPERS ===

    /**
     * Stock total disponible (tous lots non périmés confondus).
     */
    public function stockDisponible(): int
    {
        return (int) $this->lots()
            ->where('quantite_restante', '>', 0)
            ->where('date_peremption', '>=', now())
            ->sum('quantite_restante');
    }

    /**
     * Indique si le stock est sous le seuil d'alerte.
     */
    public function estEnAlerte(): bool
    {
        return $this->stockDisponible() <= $this->seuil_alerte;
    }

    // === SCOPES ===

    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }

    public function scopeSurOrdonnance($query)
    {
        return $query->where('sur_ordonnance', true);
    }
}