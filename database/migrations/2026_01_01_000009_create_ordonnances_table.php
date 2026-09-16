<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ordonnances vétérinaires.
 *
 * Une ordonnance concerne UN animal et est rédigée par UN vétérinaire.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordonnances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('animal_id')
                  ->constrained('animaux')
                  ->cascadeOnDelete()
                  ->comment('Animal concerné');
            $table->foreignId('veterinaire_id')
                  ->nullable()
                  ->constrained('veterinaires')
                  ->nullOnDelete()
                  ->comment('Vétérinaire prescripteur');

            $table->string('numero_ordonnance', 100)->nullable();
            $table->date('date_prescription');
            $table->date('date_fin_validite')->nullable();
            $table->string('fichier_scan', 255)->nullable();
            $table->text('diagnostic')->nullable();
            $table->text('observations')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('animal_id', 'idx_ordonnances_animal');
            $table->index('veterinaire_id', 'idx_ordonnances_veterinaire');
            $table->index('date_prescription', 'idx_ordonnances_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordonnances');
    }
};