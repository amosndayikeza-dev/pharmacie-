<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lignes de commande d'achat.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ligne_achats', function (Blueprint $table) {
            $table->id();

            $table->foreignId('achat_id')
                  ->constrained('achats')
                  ->cascadeOnDelete();
            $table->foreignId('medicament_id')
                  ->constrained('medicaments')
                  ->restrictOnDelete();

            // Quantités
            $table->unsignedInteger('quantite_commandee');
            $table->unsignedInteger('quantite_recue')->default(0)
                  ->comment('Mis à jour à chaque réception (livraisons partielles)');

            // Prix négociés
            $table->decimal('prix_achat_ht_unitaire', 10, 2);
            $table->decimal('taux_tva', 5, 2)->default(0);

            // Montants calculés
            $table->decimal('montant_ht', 12, 2);
            $table->decimal('montant_ttc', 12, 2);

            $table->timestamps();

            $table->index('achat_id', 'idx_ligne_achats_achat');
            $table->index('medicament_id', 'idx_ligne_achats_medicament');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ligne_achats');
    }
};