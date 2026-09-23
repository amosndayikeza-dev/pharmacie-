<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table des paramètres de l'application (clé-valeur).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parametres', function (Blueprint $table) {
            $table->id();
            $table->string('cle', 100)->unique();
            $table->text('valeur')->nullable();
            $table->enum('type', ['string', 'integer', 'decimal', 'boolean', 'json'])
                  ->default('string');
            $table->string('groupe', 50)->default('general');
            $table->string('libelle', 200)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('groupe', 'idx_parametres_groupe');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parametres');
    }
};