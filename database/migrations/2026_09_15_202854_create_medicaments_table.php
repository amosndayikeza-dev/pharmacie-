<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catalogue des médicaments.
 *
 * Le stock réel est calculé à partir des lots (FEFO).
 * Le prix de vente ici est une référence ; le prix réel est figé
 * au moment de la vente dans `ligne_ventes.prix_vente_ttc_unitaire`.
 *
 * Soft delete : un médicament retiré du catalogue reste visible dans
 * l'historique des ventes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medicaments', function (Blueprint $table) {
            $table->id();

            // Identification
            $table->string('code_cip', 50)->unique()
                  ->comment('Code CIP (identifiant unique du médicament)');
            $table->string('code_barre', 50)->nullable()->unique();
            $table->string('nom', 200);
            $table->string('denomination_commune', 200)->nullable()
                  ->comment('DCI - Dénomination Commune Internationale');
            $table->string('forme', 50)->nullable()
                  ->comment('Comprimé, sirop, injection...');
            $table->string('dosage', 50)->nullable()
                  ->comment('Ex: 500mg, 1g...');
            $table->string('laboratoire', 150)->nullable();

            // Classification
            $table->boolean('sur_ordonnance')->default(false)
                  ->comment('true = vente uniquement sur ordonnance');
            $table->string('categorie', 100)->nullable();

            // Tarification
            $table->decimal('prix_vente_ttc_reference', 10, 2)
                  ->comment('Prix de vente TTC de référence (peut varier selon le lot)');
            $table->decimal('taux_tva', 5, 2)->default(0)
                  ->comment('Taux de TVA applicable (%)');

            // Gestion du stock
            $table->unsignedInteger('seuil_alerte')->default(10)
                  ->comment('Seuil déclenchant une alerte de réapprovisionnement');
            $table->unsignedInteger('stock_max')->nullable()
                  ->comment('Stock maximum recommandé');

            // Statut
            $table->boolean('actif')->default(true);

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            // Index de recherche
            $table->index('nom', 'idx_medicaments_nom');
            $table->index('denomination_commune', 'idx_medicaments_dci');
            $table->index(['actif', 'sur_ordonnance'], 'idx_medicaments_statut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medicaments');
    }
};