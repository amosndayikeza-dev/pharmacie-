<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Ajoute les statuts 'partielle' et 'credit' à ventes.statut.
 *
 * Logique :
 *   - validee   : vente 100% payée
 *   - partielle : vente partiellement payée (crédit en cours)
 *   - credit    : vente non payée (crédit total)
 *   - annulee   : vente annulée
 *   - avoir     : retour / remboursement
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE ventes
            MODIFY COLUMN statut
            ENUM('validee', 'partielle', 'credit', 'annulee', 'avoir')
            DEFAULT 'validee'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE ventes
            MODIFY COLUMN statut
            ENUM('validee', 'annulee', 'avoir')
            DEFAULT 'validee'
        ");
    }
};