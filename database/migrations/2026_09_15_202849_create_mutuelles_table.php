<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mutuelles / assurances santé.
 *
 * Utilisées pour le tiers-payant : une partie de la vente est payée
 * par la mutuelle du patient (voir table `paiements`, type = 'mutuelle').
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mutuelles', function (Blueprint $table) {
            $table->id();

            // Identité
            $table->string('nom', 150);
            $table->string('code', 50)->unique()->comment('Code interne mutuelle');

            // Contact
            $table->string('telephone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('adresse')->nullable();

            // Conditions de prise en charge
            $table->decimal('taux_prise_en_charge', 5, 2)
                  ->default(0)
                  ->comment('Pourcentage pris en charge (0-100)');
            $table->decimal('plafond_annuel', 12, 2)->nullable()
                  ->comment('Plafond annuel de remboursement');

            // Statut
            $table->boolean('actif')->default(true);

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            $table->index('actif', 'idx_mutuelles_actif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mutuelles');
    }
};