<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modèle Parametre — Configuration de l'application (clé-valeur).
 */
class Parametre extends Model
{
    protected $fillable = [
        'cle', 'valeur', 'type', 'groupe', 'libelle', 'description',
    ];

    /**
     * Retourne la valeur avec le bon type.
     */
    public function valeurTypee(): mixed
    {
        return match ($this->type) {
            'integer' => (int) $this->valeur,
            'decimal' => (float) $this->valeur,
            'boolean' => filter_var($this->valeur, FILTER_VALIDATE_BOOLEAN),
            'json'    => json_decode($this->valeur, true),
            default   => $this->valeur,
        };
    }

    /**
     * Récupère une valeur par clé.
     */
    public static function get(string $cle, mixed $default = null): mixed
    {
        $param = static::where('cle', $cle)->first();
        return $param ? $param->valeurTypee() : $default;
    }

    /**
     * Définit une valeur par clé.
     */
    public static function set(string $cle, mixed $valeur): void
    {
        $param = static::where('cle', $cle)->first();
        if (! $param) return;

        $valeurStr = match ($param->type) {
            'json'    => is_string($valeur) ? $valeur : json_encode($valeur),
            'boolean' => $valeur ? '1' : '0',
            default   => (string) $valeur,
        };

        $param->update(['valeur' => $valeurStr]);
    }
}