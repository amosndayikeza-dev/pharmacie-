<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Proprietaire — Propriétaire d'animaux (= client payeur).
 *
 * Peut être un particulier, une ferme, une clinique ou une société.
 */
class Proprietaire extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'type', 'nom', 'prenom', 'raison_sociale',
        'date_naissance', 'sexe',
        'telephone', 'email', 'adresse', 'ville', 'province', 'pays',
        'numero_piece_identite', 'numero_contribuable',
        'consentement_rgpd', 'date_consentement', 'notes',
    ];

    protected $casts = [
        'date_naissance'    => 'date',
        'date_consentement' => 'datetime',
        'consentement_rgpd' => 'boolean',
    ];

    // === RELATIONS ===

    public function animaux(): HasMany
    {
        return $this->hasMany(Animal::class);
    }

    public function ventes(): HasMany
    {
        return $this->hasMany(Vente::class, 'proprietaire_id');
    }

    // === HELPERS ===

    /** Nom complet ou raison sociale. */
    public function nomComplet(): string
    {
        if ($this->type === 'particulier') {
            return trim("{$this->prenom} {$this->nom}");
        }

        return $this->raison_sociale ?? $this->nom;
    }

    public function estParticulier(): bool
    {
        return $this->type === 'particulier';
    }

    // === SCOPES ===

    public function scopeParticulier($query)
    {
        return $query->where('type', 'particulier');
    }

    public function scopeFerme($query)
    {
        return $query->where('type', 'ferme');
    }
}