<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal des mouvements de stock (AUDIT, insert-only).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mouvements_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lot_id')->constrained('lots')->restrictOnDelete();
            $table->dateTime('date_heure');
            $table->integer('quantite')->comment('Positif = entrée, négatif = sortie');
            $table->enum('type', ['achat', 'vente', 'perte', 'ajustement']);
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_type', 50)->nullable();
            $table->foreignId('utilisateur_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('motif')->nullable();

            $table->timestamps();

            $table->index(['lot_id', 'date_heure'], 'idx_mvt_lot_date');
            $table->index('type', 'idx_mvt_type');
            $table->index(['reference_type', 'reference_id'], 'idx_mvt_reference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mouvements_stock');
    }
};