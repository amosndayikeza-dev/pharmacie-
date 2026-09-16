<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lignes de vente (coût figé immuable).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ligne_ventes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vente_id')->constrained('ventes')->cascadeOnDelete();
            $table->foreignId('lot_id')->constrained('lots')->restrictOnDelete();
            $table->foreignId('medicament_id')->constrained('medicaments')->restrictOnDelete();

            $table->unsignedInteger('quantite');

            // Prix figés (immuables)
            $table->decimal('prix_vente_ttc_unitaire', 10, 2);
            $table->decimal('prix_achat_ht_unitaire_fige', 10, 2);
            $table->decimal('taux_tva', 5, 2);

            $table->decimal('montant_ht', 10, 2);
            $table->decimal('montant_tva', 10, 2);
            $table->decimal('montant_ttc', 10, 2);
            $table->decimal('marge_brute', 10, 2);

            $table->timestamps();

            $table->index(['lot_id', 'vente_id'], 'idx_lignes_lot_vente');
            $table->index('medicament_id', 'idx_lignes_medicament');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ligne_ventes');
    }
};