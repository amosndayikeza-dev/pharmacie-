<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * En-tête des ventes.
 *
 * PRINCIPE INSERT-ONLY : jamais modifiée ni supprimée.
 * client = propriétaire (payeur), animal = patient (optionnel).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventes', function (Blueprint $table) {
            $table->id();

            $table->string('numero_ticket', 50)->unique();

            // Relations
            $table->foreignId('proprietaire_id')
                  ->nullable()
                  ->constrained('proprietaires')
                  ->nullOnDelete()
                  ->comment('Propriétaire payeur (NULL = vente anonyme)');
            $table->foreignId('animal_id')
                  ->nullable()
                  ->constrained('animaux')
                  ->nullOnDelete()
                  ->comment('Animal concerné (NULL = vente sans animal précis)');
            $table->foreignId('utilisateur_id')
                  ->constrained('users')
                  ->restrictOnDelete()
                  ->comment('Vendeur/caissier');
            $table->foreignId('ordonnance_id')
                  ->nullable()
                  ->constrained('ordonnances')
                  ->nullOnDelete();

            // Date
            $table->dateTime('date_heure');

            // Montants
            $table->decimal('montant_total_ht', 12, 2)->default(0);
            $table->decimal('montant_total_tva', 12, 2)->default(0);
            $table->decimal('montant_total_ttc', 12, 2);
            $table->decimal('montant_remise', 12, 2)->default(0);

            // Statut
            $table->enum('statut', ['validee', 'annulee', 'avoir'])
                  ->default('validee');

            $table->timestamps();

            $table->index(['date_heure', 'proprietaire_id'], 'idx_ventes_histo');
            $table->index('utilisateur_id', 'idx_ventes_utilisateur');
            $table->index('animal_id', 'idx_ventes_animal');
            $table->index('statut', 'idx_ventes_statut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventes');
    }
};