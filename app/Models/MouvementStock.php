<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MouvementStock extends Model
{
    protected $table = "mouvements_stock";
    protected $fillable = [
        'lot_id',
        'date_heure',
        'quantite',
        'type',
        'reference_id',
    ];

    protected $casts = ['date_heure' => 'datetime'];

    public function lot()
    {
        return $this->belongsTo(Lot::class);
    }
}
