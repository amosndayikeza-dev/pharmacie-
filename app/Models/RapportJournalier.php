<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Modèle RapportJournalier — Agrégats pré-calculés par le CRON (23h59).
 *
 * PERFORMANCE : les rapports lisent exclusivement cette table.
 */
class RapportJournalier extends Model
{
    protected $table = 'rapports_journaliers';

    protected $primaryKey = 'date_reference';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'date_reference',
        'total_ca_ht',
        'total_ca_tva',
        'total_ca_ttc',
        'total_marge_brute_ttc',
        'nb_tickets',
        'nb_clients_uniques',
        'panier_moyen',
        'top_medicament_id',
        'top_medicament_quantite',
        'total_especes',
        'total_carte',
        'total_mutuelle',
        'total_credit',
        'calcule_le',
    ];

    protected $casts = [
        'date_reference'        => 'date',
        'calcule_le'            => 'datetime',
        'total_ca_ht'           => 'decimal:2',
        'total_ca_tva'          => 'decimal:2',
        'total_ca_ttc'          => 'decimal:2',
        'total_marge_brute_ttc' => 'decimal:2',
        'panier_moyen'          => 'decimal:2',
        'total_especes'         => 'decimal:2',
        'total_carte'           => 'decimal:2',
        'total_mutuelle'        => 'decimal:2',
        'total_credit'          => 'decimal:2',
    ];
}