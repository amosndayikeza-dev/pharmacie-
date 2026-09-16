<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Paiements associés à une vente (multi-paiements).
 *
 * Vétérinaire : plus de mutuelle ni de sécurité sociale.
 * Types : espèces, carte, crédit, mobile money.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('paiements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vente_id')->constrained('ventes')->cascadeOnDelete();

            $table->enum('type', ['especes', 'carte', 'mobile_money', 'credit'])
                  ->comment('Mode de paiement');
            $table->decimal('montant', 12, 2);
            $table->string('reference_externe', 100)->nullable()
                  ->comment('N° transaction Lumicash, Ecocash, carte...');

            $table->timestamps();

            $table->index('vente_id', 'idx_paiements_vente');
            $table->index('type', 'idx_paiements_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paiements');
    }
};