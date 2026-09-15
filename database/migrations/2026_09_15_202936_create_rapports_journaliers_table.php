<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rapports journaliers pré-calculés.
 *
 * PERFORMANCE :
 *   Un script CRON (23h59) agrège les données du jour dans cette table.
 *   Les rapports hebdomadaires/mensuels/annuels sont obtenus par de
 *   simples SUM() sur cette table → réponse instantanée (< 100ms).
 *
 * PRINCIPE DES AGRÉGATS :
 *   Aucune requête lourde ne doit être faite en temps réel sur `ventes`.
 *   Les écrans de reporting lisent EXCLUSIVEMENT cette table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rapports_journaliers', function (Blueprint $table) {
            // PK = date de référence (une ligne par jour)
            $table->date('date_reference')->primary();

            // Chiffre d'affaires
            $table->decimal('total_ca_ht', 14, 2)->default(0);
            $table->decimal('total_ca_tva', 14, 2)->default(0);
            $table->decimal('total_ca_ttc', 14, 2)->default(0);

            // Marge
            $table->decimal('total_marge_brute_ttc', 14, 2)->default(0);

            // Statistiques de vente
            $table->unsignedInteger('nb_tickets')->default(0);
            $table->unsignedInteger('nb_clients_uniques')->default(0);
            $table->decimal('panier_moyen', 12, 2)->default(0);

            // Top produit du jour
            $table->foreignId('top_medicament_id')
                  ->nullable()
                  ->constrained('medicaments')
                  ->nullOnDelete();
            $table->unsignedInteger('top_medicament_quantite')->default(0);

            // Répartition par mode de paiement
            $table->decimal('total_especes', 14, 2)->default(0);
            $table->decimal('total_carte', 14, 2)->default(0);
            $table->decimal('total_mutuelle', 14, 2)->default(0);
            $table->decimal('total_credit', 14, 2)->default(0);

            // Traçabilité
            $table->timestamp('calcule_le')->nullable()
                  ->comment('Date/heure du dernier calcul par le CRON');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rapports_journaliers');
    }
};