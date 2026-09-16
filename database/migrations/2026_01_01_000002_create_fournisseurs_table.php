<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fournisseurs de médicaments vétérinaires.
 *
 * Soft delete : on ne supprime jamais un fournisseur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fournisseurs', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 150);
            $table->string('raison_sociale', 200)->nullable();
            $table->string('numero_contribuable', 50)->nullable();
            $table->string('telephone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('adresse')->nullable();
            $table->string('ville', 100)->nullable();
            $table->string('pays', 100)->default('Burundi');
            $table->unsignedSmallInteger('delai_livraison_jours')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('nom', 'idx_fournisseurs_nom');
            $table->index('actif', 'idx_fournisseurs_actif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fournisseurs');
    }
};