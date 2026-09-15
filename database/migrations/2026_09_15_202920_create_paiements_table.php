<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Paiements associés à une vente.
 *
 * Une vente peut avoir PLUSIEURS paiements (ex: 50% espèces + 50% mutuelle).
 * Types supportés :
 *   - especes   : paiement cash
 *   - carte     : carte bancaire
 *   - secu      : sécurité sociale
 *   - mutuelle  : tiers-payant mutuelle
 *   - credit    : vente à crédit (créance client)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paiements', function (Blueprint $table) {
            $table->id();

            // Relation
            $table->foreignId('vente_id')
                  ->constrained('ventes')
                  ->cascadeOnDelete()
                  ->comment('Vente concernée');

            // Type de paiement
            $table->enum('type', ['especes', 'carte', 'secu', 'mutuelle', 'credit'])
                  ->comment('Mode de paiement');

            // Montant
            $table->decimal('montant', 12, 2)
                  ->comment('Montant payé via ce mode');

            // Référence externe (n° transaction carte, n° prise en charge mutuelle...)
            $table->string('reference_externe', 100)->nullable();

            // Traçabilité
            $table->timestamps();

            // Index
            $table->index('vente_id', 'idx_paiements_vente');
            $table->index('type', 'idx_paiements_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paiements');
    }
};