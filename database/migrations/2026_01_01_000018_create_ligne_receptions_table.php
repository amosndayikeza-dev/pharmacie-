<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lignes de réception (= création de lots).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ligne_receptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reception_id')->constrained('receptions')->cascadeOnDelete();
            $table->foreignId('ligne_achat_id')->nullable()->constrained('ligne_achats')->nullOnDelete();
            $table->foreignId('medicament_id')->constrained('medicaments')->restrictOnDelete();
            $table->string('numero_lot', 100);
            $table->date('date_peremption');
            $table->date('date_fabrication')->nullable();
            $table->unsignedInteger('quantite_recue');
            $table->decimal('prix_achat_ht_unitaire', 10, 2);
            $table->decimal('taux_tva', 5, 2)->default(0);
            $table->decimal('montant_ht', 12, 2);
            $table->decimal('montant_ttc', 12, 2);
            $table->timestamps();

            $table->index('reception_id', 'idx_ligne_recept_reception');
            $table->index('medicament_id', 'idx_ligne_recept_medicament');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ligne_receptions');
    }
};