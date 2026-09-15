<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
class Medicament extends Model

{
    use SoftDeletes;
    protected $fillable = [
        'code_cip','nom','prix_vente_ttc_reference','seuil_alerte',
    ];

    public function lots(){
        return $this->hasMany(Lot::class);
    }

    //stock total disponible
    public function stockDisponible(){
        return $this->lots()
            ->where('_restante_quantite', '>', 0)
            ->where('date_peremption', '>=', now())
            ->sum('quantite_restante');
    }
}
