<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Patients / clients de la pharmacie.
 *
 * Une seule table couvre les deux concepts :
 *  - Patient identifié (avec ou sans ordonnance)
 *  - Client anonyme (vente OTC → patient_id NULL dans `ventes`)
 *
 * Soft delete obligatoire (RGPD) : un patient peut demander la
 * suppression de ses données ; elles restent en base mais anonymisées.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();

            // Identité (prenom nullable pour clients occasionnels)
            $table->string('nom', 100);
            $table->string('prenom', 100)->nullable();
            $table->date('date_naissance')->nullable();
            $table->enum('sexe', ['M', 'F', 'Autre'])->nullable();

            // Contact
            $table->string('telephone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('adresse')->nullable();
            $table->string('ville', 100)->nullable();

            // Informations mutuelle (nullable : tout le monde n'en a pas)
            $table->foreignId('mutuelle_id')
                  ->nullable()
                  ->constrained('mutuelles')
                  ->nullOnDelete()
                  ->comment('Mutuelle du patient (nullable)');
            $table->string('numero_affiliation', 100)->nullable()
                  ->comment('Numéro d\'affiliation auprès de la mutuelle');
            $table->date('date_validite_mutuelle')->nullable()
                  ->comment('Date de fin de validité du contrat mutuelle');

            // Informations médicales (utiles au pharmacien)
            $table->text('allergies')->nullable();
            $table->text('antecedents')->nullable();
            $table->text('notes')->nullable();

            // RGPD : consentement à la conservation des données
            $table->boolean('consentement_rgpd')->default(false);
            $table->timestamp('date_consentement')->nullable();

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            // Index
            $table->index('nom', 'idx_patients_nom');
            $table->index('telephone', 'idx_patients_tel');
            $table->index('mutuelle_id', 'idx_patients_mutuelle');
            $table->index('date_validite_mutuelle', 'idx_patients_validite_mutuelle');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};