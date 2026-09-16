<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Animal — Patient de la pharmacie vétérinaire.
 *
 * Un animal appartient à un propriétaire et possède une espèce.
 */
class Animal extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'proprietaire_id', 'espece_id',
        'nom', 'numero_identification', 'sexe', 'date_naissance',
        'race', 'couleur', 'poids_kg', 'taille',
        'sterilise', 'gestante', 'allaitante', 'vivant',
        'allergies', 'antecedents', 'notes',
    ];

    protected $casts = [
        'date_naissance' => 'date',
        'poids_kg'       => 'decimal:2',
        'sterilise'      => 'boolean',
        'gestante'       => 'boolean',
        'allaitante'     => 'boolean',
        'vivant'         => 'boolean',
    ];

    // === RELATIONS ===

    public function proprietaire(): BelongsTo
    {
        return $this->belongsTo(Proprietaire::class);
    }

    public function espece(): BelongsTo
    {
        return $this->belongsTo(Espece::class);
    }

    public function ordonnances(): HasMany
    {
        return $this->hasMany(Ordonnance::class);
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(Vaccination::class);
    }

    public function ventes(): HasMany
    {
        return $this->hasMany(Vente::class);
    }

    // === HELPERS ===

    /** Âge de l'animal en années. */
    public function ageAnnees(): ?int
    {
        return $this->date_naissance?->diffInYears(now());
    }

    /** Nom d'affichage : "Rex (Chien)" */
    public function nomAffichage(): string
    {
        $nom = $this->nom ?? "Animal #{$this->id}";
        $espece = $this->espece?->nom ?? '';

        return trim("{$nom} ({$espece})");
    }

    // === SCOPES ===

    public function scopeVivant($query)
    {
        return $query->where('vivant', true);
    }

    public function scopeGestante($query)
    {
        return $query->where('gestante', true);
    }
}