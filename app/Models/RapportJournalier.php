<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RapportJournalier extends Model
{
    protected $table = 'rapports_journaliers';
    protected $primaryKey = 'date_reference';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'date_reference', 'total_ca_ttc', 'total_marge_brute_ttc',
        'nb_tickets', 'nb_clients_uniques', 'panier_moyen', 'top_medicament_id',
    ];

    protected $casts = ['date_reference' => 'date'];
}