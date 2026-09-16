<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Medicament — Catalogue des médicaments vétérinaires.
 *
 * Le stock réel est calculé à partir des lots (FEFO).
 */
class Medicament extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code_cip', 'code_barre', 'nom', 'denomination_commune',
        'forme', 'dosage', 'laboratoire',
        'categorie', 'sur_ordonnance', 'usage_preventif',
        'posologie', 'voie_administration', 'delai_attente',
        'prix_vente_ttc_reference', 'taux_tva',
        'seuil_alerte', 'stock_max', 'actif',
    ];

    protected $casts = [
        'prix_vente_ttc_reference' => 'decimal:2',
        'taux_tva'                 => 'decimal:2',
        'sur_ordonnance'           => 'boolean',
        'usage_preventif'          => 'boolean',
        'actif'                    => 'boolean',
    ];

    // === RELATIONS ===

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }

    /** Espèces cibles de ce médicament (N-N). */
    public function especes(): BelongsToMany
    {
        return $this->belongsToMany(Espece::class, 'medicament_espece')
                    ->withTimestamps();
    }

    public function ligneVentes(): HasMany
    {
        return $this->hasMany(LigneVente::class);
    }

    public function ligneAchats(): HasMany
    {
        return $this->hasMany(LigneAchat::class);
    }

    public function ligneReceptions(): HasMany
    {
        return $this->hasMany(LigneReception::class);
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(Vaccination::class);
    }

    // === HELPERS ===

    /** Stock total disponible (tous lots non périmés). */
    public function stockDisponible(): int
    {
        return (int) $this->lots()
            ->where('quantite_restante', '>', 0)
            ->where('date_peremption', '>=', now())
            ->sum('quantite_restante');
    }

    /** Vrai si le stock est sous le seuil d'alerte. */
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

    public function scopePourEspece($query, int $especeId)
    {
        return $query->whereHas('especes', fn ($q) => $q->where('especes.id', $especeId));
    }
}