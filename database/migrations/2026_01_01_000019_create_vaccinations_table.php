<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Suivi des vaccinations des animaux.
 *
 * Permet de savoir quand un animal a été vacciné et quand
 * doit avoir lieu le prochain rappel.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccinations', function (Blueprint $table) {
            $table->id();

            // Relations
            $table->foreignId('animal_id')
                  ->constrained('animaux')
                  ->cascadeOnDelete();
            $table->foreignId('veterinaire_id')
                  ->nullable()
                  ->constrained('veterinaires')
                  ->nullOnDelete();
            $table->foreignId('medicament_id')
                  ->nullable()
                  ->constrained('medicaments')
                  ->nullOnDelete()
                  ->comment('Vaccin utilisé (lien vers le catalogue)');

            // Détails
            $table->string('nom_vaccin', 150)
                  ->comment('Nom du vaccin (ex: Fièvre aphteuse, Rage...)');
            $table->string('numero_lot_vaccin', 100)->nullable();
            $table->date('date_vaccination');
            $table->date('date_prochain_rappel')->nullable()
                  ->comment('Date du prochain rappel');

            // Observations
            $table->text('observations')->nullable();
            $table->text('reaction')->nullable()
                  ->comment('Réaction éventuelle de l\'animal');

            // Traçabilité
            $table->timestamps();

            $table->index('animal_id', 'idx_vaccinations_animal');
            $table->index('date_vaccination', 'idx_vaccinations_date');
            $table->index('date_prochain_rappel', 'idx_vaccinations_rappel');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccinations');
    }
};