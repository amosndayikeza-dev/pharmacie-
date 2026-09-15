<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Patient extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nom',
        'prenom',
        'date_naissance',
        'telephone',
        'email',
        'adresse'
    ];

    protected $casts = [
        'date_naissance' => 'date'
    ];

    public function ventes(){
        return $this->hasMany(Vente::class, 'client_id');
    }
}
