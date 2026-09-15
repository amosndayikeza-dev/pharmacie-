<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * En-tête des ventes.
 *
 * PRINCIPE INSERT-ONLY :
 *   Une vente n'est jamais modifiée ni supprimée. En cas d'erreur,
 *   on crée une vente de contrepartie (avoir) ou un mouvement d'ajustement.
 *
 * CLIENT :
 *   - patient_id NULL  → vente anonyme (OTC)
 *   - patient_id renseigné → vente identifiée
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventes', function (Blueprint $table) {
            $table->id();

            // Numéro unique de ticket (utile pour le comptable)
            $table->string('numero_ticket', 50)->unique()
                  ->comment('Numéro unique du ticket de caisse');

            // Relations
            $table->foreignId('patient_id')
                  ->nullable()
                  ->constrained('patients')
                  ->nullOnDelete()
                  ->comment('Patient (NULL = vente anonyme)');
            $table->foreignId('utilisateur_id')
                  ->constrained('users')
                  ->restrictOnDelete()
                  ->comment('Vendeur / caissier ayant réalisé la vente');
            $table->foreignId('ordonnance_id')
                  ->nullable()
                  ->constrained('ordonnances')
                  ->nullOnDelete()
                  ->comment('Ordonnance associée (nullable)');

            // Date de la vente
            $table->dateTime('date_heure')
                  ->comment('Horodatage précis de la vente');

            // Montants
            $table->decimal('montant_total_ht', 12, 2)->default(0);
            $table->decimal('montant_total_tva', 12, 2)->default(0);
            $table->decimal('montant_total_ttc', 12, 2)
                  ->comment('Montant total payé par le client');
            $table->decimal('montant_remise', 12, 2)->default(0);

            // Statut (utile pour les avoirs)
            $table->enum('statut', ['validee', 'annulee', 'avoir'])
                  ->default('validee')
                  ->comment('Statut de la vente');

            // Traçabilité
            $table->timestamps();

            // Index pour l'historique
            $table->index(['date_heure', 'patient_id'], 'idx_ventes_histo');
            $table->index('utilisateur_id', 'idx_ventes_utilisateur');
            $table->index('statut', 'idx_ventes_statut');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ventes');
    }
};