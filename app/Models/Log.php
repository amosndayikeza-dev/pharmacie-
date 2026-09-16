<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modèle Log — Journal des actions (audit RGPD).
 *
 * INSERT-ONLY.
 */
class Log extends Model
{
    protected $table = 'logs';

    protected $fillable = [
        'utilisateur_id',
        'action',
        'module',
        'entite_type',
        'entite_id',
        'donnees_avant',
        'donnees_apres',
        'ip_address',
        'user_agent',
        'date_heure',
    ];

    protected $casts = [
        'donnees_avant' => 'array',
        'donnees_apres' => 'array',
        'date_heure'    => 'datetime',
    ];

    /**
     * PROTECTION : insert-only.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new \RuntimeException('Un log est immuable (insert-only).');
        });

        static::deleting(function () {
            throw new \RuntimeException('Un log ne peut pas être supprimé.');
        });
    }

    // === RELATIONS ===

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }
}