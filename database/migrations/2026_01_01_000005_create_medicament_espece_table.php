<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table pivot : médicament ↔ espèce cible.
 *
 * Un médicament peut être destiné à plusieurs espèces.
 * Une espèce peut avoir plusieurs médicaments.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medicament_espece', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medicament_id')
                  ->constrained('medicaments')
                  ->cascadeOnDelete();
            $table->foreignId('espece_id')
                  ->constrained('especes')
                  ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(['medicament_id', 'espece_id'], 'uk_medicament_espece');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medicament_espece');
    }
};