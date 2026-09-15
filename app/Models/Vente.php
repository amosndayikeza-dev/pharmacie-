<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vente extends Model
{
    protected $fillable = [
        'client_id', 'utilisateur_id', 'ordonnance_id',
        'date_heure', 'montant_total_ttc',
    ];

    protected $casts = ['date_heure' => 'datetime'];

    public function client()
    {
        return $this->belongsTo(Patient::class, 'client_id');
    }

    public function utilisateur()
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function lignes()
    {
        return $this->hasMany(LigneVente::class);
    }

    public function paiements()
    {
        return $this->hasMany(Paiement::class);
    }
}