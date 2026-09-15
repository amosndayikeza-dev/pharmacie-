<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Médecins prescripteurs.
 *
 * Rattachés aux ordonnances pour la traçabilité médicale.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medecins', function (Blueprint $table) {
            $table->id();

            // Identité
            $table->string('nom', 100);
            $table->string('prenom', 100)->nullable();
            $table->string('numero_rpps', 50)->nullable()->unique()
                  ->comment('Numéro RPPS ou équivalent local');

            // Spécialité
            $table->string('specialite', 150)->nullable();

            // Contact
            $table->string('telephone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('adresse_cabinet')->nullable();

            // Statut
            $table->boolean('actif')->default(true);

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            $table->index('nom', 'idx_medecins_nom');
            $table->index('specialite', 'idx_medecins_specialite');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medecins');
    }
};