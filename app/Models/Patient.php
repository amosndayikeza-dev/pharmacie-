<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Patient — Patient / client de la pharmacie.
 *
 * Une seule table couvre patients identifiés et clients anonymes.
 * (Vente anonyme = patient_id NULL dans `ventes`.)
 *
 * Soft delete obligatoire (RGPD).
 */
class Patient extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nom',
        'prenom',
        'date_naissance',
        'sexe',
        'telephone',
        'email',
        'adresse',
        'ville',
        'mutuelle_id',
        'numero_affiliation',
        'date_validite_mutuelle',
        'allergies',
        'antecedents',
        'notes',
        'consentement_rgpd',
        'date_consentement',
    ];

    protected $casts = [
        'date_naissance'         => 'date',
        'date_validite_mutuelle' => 'date',
        'date_consentement'      => 'datetime',
        'consentement_rgpd'      => 'boolean',
    ];

    // === RELATIONS ===

    /** Mutuelle du patient. */
    public function mutuelle(): BelongsTo
    {
        return $this->belongsTo(Mutuelle::class);
    }

    /** Ordonnances du patient. */
    public function ordonnances(): HasMany
    {
        return $this->hasMany(Ordonnance::class);
    }

    /** Ventes associées au patient. */
    public function ventes(): HasMany
    {
        return $this->hasMany(Vente::class);
    }

    // === HELPERS ===

    /** Nom complet du patient. */
    public function nomComplet(): string
    {
        return trim("{$this->prenom} {$this->nom}");
    }

    /** Vérifie si le contrat mutuelle est encore valide. */
    public function mutuelleValide(): bool
    {
        if (! $this->date_validite_mutuelle) {
            return false;
        }

        return $this->date_validite_mutuelle->isFuture();
    }

    // === SCOPES ===

    public function scopeAvecMutuelleValide($query)
    {
        return $query->whereNotNull('mutuelle_id')
                     ->where('date_validite_mutuelle', '>=', now());
    }
}