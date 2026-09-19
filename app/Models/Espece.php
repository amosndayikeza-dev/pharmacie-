<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Modèle Espece — Référentiel des espèces animales.
 *
 * Catégories : compagnie, elevage, volaille, equin, autre.
 */
class Espece extends Model
{
    use SoftDeletes;
    protected $table="especes";
    protected $fillable = [
        'nom', 'nom_scientifique', 'categorie',
        'description', 'actif',
    ];

    protected $casts = [
        'actif' => 'boolean',
    ];

    // === RELATIONS ===

    /** Animaux de cette espèce. */
    public function animaux(): HasMany
    {
        return $this->hasMany(Animal::class);
    }

    /** Médicaments destinés à cette espèce (relation N-N). */
    public function medicaments(): BelongsToMany
    {
        return $this->belongsToMany(Medicament::class, 'medicament_espece')
                    ->withTimestamps();
    }

    // === SCOPES ===

    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }

    public function scopeCategorie($query, string $categorie)
    {
        return $query->where('categorie', $categorie);
    }
}