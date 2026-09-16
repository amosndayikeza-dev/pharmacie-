<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vétérinaires prescripteurs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('veterinaires', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 100);
            $table->string('prenom', 100)->nullable();
            $table->string('numero_ordre', 50)->nullable()->unique()
                  ->comment('Numéro d\'inscription à l\'ordre des vétérinaires');
            $table->string('specialite', 150)->nullable()
                  ->comment('Bovins, animaux de compagnie, volaille...');
            $table->string('telephone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('adresse_cabinet')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('nom', 'idx_veterinaires_nom');
            $table->index('specialite', 'idx_veterinaires_specialite');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('veterinaires');
    }
};