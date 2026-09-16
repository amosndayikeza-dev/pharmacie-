<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catalogue des médicaments vétérinaires.
 *
 * Le stock réel est calculé à partir des lots (FEFO).
 * Soft delete : un médicament retiré reste dans l'historique des ventes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medicaments', function (Blueprint $table) {
            $table->id();

            // Identification
            $table->string('code_cip', 50)->unique()
                  ->comment('Code CIP vétérinaire ou code interne');
            $table->string('code_barre', 50)->nullable()->unique();
            $table->string('nom', 200);
            $table->string('denomination_commune', 200)->nullable()
                  ->comment('DCI - Dénomination Commune Internationale');
            $table->string('forme', 50)->nullable()
                  ->comment('Comprimé, sirop, injection, pour-on...');
            $table->string('dosage', 50)->nullable()
                  ->comment('Ex: 500mg, 1g, 10%...');
            $table->string('laboratoire', 150)->nullable();

            // Classification vétérinaire
            $table->string('categorie', 100)->nullable()
                  ->comment('Antibiotique, antiparasitaire, vaccin...');
            $table->boolean('sur_ordonnance')->default(false)
                  ->comment('true = vente uniquement sur ordonnance vétérinaire');
            $table->boolean('usage_preventif')->default(false)
                  ->comment('Vaccins, vitamines préventives...');

            // Posologie (indicative, nullable)
            $table->text('posologie')->nullable()
                  ->comment('Instructions de dosage générales');
            $table->string('voie_administration', 100)->nullable()
                  ->comment('Orale, injectable, cutanée, intramusculaire...');
            $table->string('delai_attente', 100)->nullable()
                  ->comment('Délai avant abattage/consommation (bétail)');

            // Tarification
            $table->decimal('prix_vente_ttc_reference', 10, 2)
                  ->comment('Prix de vente TTC de référence');
            $table->decimal('taux_tva', 5, 2)->default(0)
                  ->comment('Taux de TVA applicable (%)');

            // Gestion du stock
            $table->unsignedInteger('seuil_alerte')->default(10);
            $table->unsignedInteger('stock_max')->nullable();

            // Statut
            $table->boolean('actif')->default(true);

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            // Index
            $table->index('nom', 'idx_medicaments_nom');
            $table->index('denomination_commune', 'idx_medicaments_dci');
            $table->index(['actif', 'sur_ordonnance'], 'idx_medicaments_statut');
            $table->index('categorie', 'idx_medicaments_categorie');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medicaments');
    }
};