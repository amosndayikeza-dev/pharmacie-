<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LigneVente extends Model
{
    protected $table = 'ligne_ventes';

    protected $fillable = [
        'vente_id', 'lot_id', 'medicament_id', 'quantite',
        'prix_vente_ttc_unitaire', 'prix_achat_ht_unitaire_fige', 'taux_tva',
    ];

    protected static function booted(): void
    {
        static::updating(function ($ligne) {
            if ($ligne->isDirty('prix_achat_ht_unitaire_fige')) {
                throw new \RuntimeException('Le coût d’achat figé est immuable.');
            }
        });

        static::deleting(function () {
            throw new \RuntimeException('Une ligne de vente ne peut pas être supprimée.');
        });
    }

    public function vente()
    {
        return $this->belongsTo(Vente::class);
    }

    public function lot()
    {
        return $this->belongsTo(Lot::class);
    }

    public function medicament()
    {
        return $this->belongsTo(Medicament::class);
    }
}