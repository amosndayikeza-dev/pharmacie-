<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Fournisseur extends Model
{
    use SoftDeletes; //permet de ne pas supprimer une donne definitivement

    protected $fillable = [
        'nom',
        'telephone',
        'email',
        'adresse',
    ];

    public function lots(){
        return $this->hasMany(Lot::class);
    }
}
