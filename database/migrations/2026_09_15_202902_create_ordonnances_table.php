<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ordonnances médicales.
 *
 * Une ordonnance appartient à un patient et est rédigée par un médecin.
 * Elle peut contenir plusieurs lignes de prescription.
 *
 * Note : les lignes d'ordonnance ne sont pas modélisées ici car elles
 * sont reflétées par les `ligne_ventes` associées à l'ordonnance.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordonnances', function (Blueprint $table) {
            $table->id();

            // Relations
            $table->foreignId('patient_id')
                  ->constrained('patients')
                  ->cascadeOnDelete()
                  ->comment('Patient concerné');
            $table->foreignId('medecin_id')
                  ->nullable()
                  ->constrained('medecins')
                  ->nullOnDelete()
                  ->comment('Médecin prescripteur (nullable si non précisé)');

            // Identification de l'ordonnance
            $table->string('numero_ordonnance', 100)->nullable()
                  ->comment('Numéro figurant sur l\'ordonnance papier');
            $table->date('date_prescription');

            // Durée de validité (certaines ordonnances sont valables 1 mois, 3 mois...)
            $table->date('date_fin_validite')->nullable();

            // Scan / fichier joint (facultatif)
            $table->string('fichier_scan', 255)->nullable()
                  ->comment('Chemin vers le scan de l\'ordonnance');

            // Notes
            $table->text('observations')->nullable();

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            // Index
            $table->index('patient_id', 'idx_ordonnances_patient');
            $table->index('medecin_id', 'idx_ordonnances_medecin');
            $table->index('date_prescription', 'idx_ordonnances_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordonnances');
    }
};