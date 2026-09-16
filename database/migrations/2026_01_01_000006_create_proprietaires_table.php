<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Propriétaires des animaux (= clients payeurs).
 *
 * Peut être une personne physique (éleveur) ou morale (ferme, clinique).
 * Un propriétaire peut posséder plusieurs animaux.
 *
 * Soft delete obligatoire (RGPD) : consentement, droit à l'oubli.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proprietaires', function (Blueprint $table) {
            $table->id();

            // Type
            $table->enum('type', ['particulier', 'ferme', 'clinique', 'societe'])
                  ->default('particulier');

            // Identité
            $table->string('nom', 100);
            $table->string('prenom', 100)->nullable();
            $table->string('raison_sociale', 200)->nullable()
                  ->comment('Pour fermes/sociétés');
            $table->date('date_naissance')->nullable();
            $table->enum('sexe', ['M', 'F', 'Autre'])->nullable();

            // Contact
            $table->string('telephone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('adresse')->nullable();
            $table->string('ville', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('pays', 100)->default('Burundi');

            // Identification
            $table->string('numero_piece_identite', 50)->nullable()
                  ->comment('CIN, passeport...');
            $table->string('numero_contribuable', 50)->nullable();

            // RGPD
            $table->boolean('consentement_rgpd')->default(false);
            $table->timestamp('date_consentement')->nullable();

            $table->text('notes')->nullable();

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            // Index
            $table->index('nom', 'idx_proprietaires_nom');
            $table->index('telephone', 'idx_proprietaires_tel');
            $table->index('type', 'idx_proprietaires_type');
            $table->index('ville', 'idx_proprietaires_ville');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proprietaires');
    }
};