<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rapports journaliers pré-calculés (agrégats CRON 23h59).
 *
 * Vétérinaire : plus de mutuelle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rapports_journaliers', function (Blueprint $table) {
            $table->date('date_reference')->primary();

            // CA
            $table->decimal('total_ca_ht', 14, 2)->default(0);
            $table->decimal('total_ca_tva', 14, 2)->default(0);
            $table->decimal('total_ca_ttc', 14, 2)->default(0);

            // Marge
            $table->decimal('total_marge_brute_ttc', 14, 2)->default(0);

            // Stats
            $table->unsignedInteger('nb_tickets')->default(0);
            $table->unsignedInteger('nb_clients_uniques')->default(0);
            $table->decimal('panier_moyen', 12, 2)->default(0);

            // Top produit
            $table->foreignId('top_medicament_id')->nullable()->constrained('medicaments')->nullOnDelete();
            $table->unsignedInteger('top_medicament_quantite')->default(0);

            // Répartition par mode de paiement
            $table->decimal('total_especes', 14, 2)->default(0);
            $table->decimal('total_carte', 14, 2)->default(0);
            $table->decimal('total_mobile_money', 14, 2)->default(0);
            $table->decimal('total_credit', 14, 2)->default(0);

            // Répartition par espèce (utile pour analyse)
            $table->json('repartition_par_espece')->nullable()
                  ->comment('CA par espèce animale (JSON)');

            $table->timestamp('calcule_le')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rapports_journaliers');
    }
};