<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal des actions utilisateurs.
 *
 * CONFORMITÉ RGPD :
 *   Toute action sensible (création, modification, suppression,
 *   consultation de données personnelles) doit être tracée.
 *
 * PRINCIPE INSERT-ONLY :
 *   Aucun log n'est modifié ni supprimé.
 *   Rétention recommandée : 3 à 5 ans (à configurer).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs', function (Blueprint $table) {
            $table->id();

            // Utilisateur ayant réalisé l'action
            $table->foreignId('utilisateur_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // Action réalisée
            $table->string('action', 100)
                  ->comment('Ex: creation_vente, modification_patient, connexion...');
            $table->string('module', 100)
                  ->comment('Ex: ventes, patients, stock...');

            // Cible de l'action
            $table->string('entite_type', 100)->nullable()
                  ->comment('Classe du modèle concerné');
            $table->unsignedBigInteger('entite_id')->nullable()
                  ->comment('ID de l\'entité concernée');

            // Détails
            $table->json('donnees_avant')->nullable()
                  ->comment('État avant modification (JSON)');
            $table->json('donnees_apres')->nullable()
                  ->comment('État après modification (JSON)');

            // Contexte technique
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();

            // Traçabilité
            $table->timestamp('date_heure')->useCurrent();

            // Index pour les recherches d'audit
            $table->index(['utilisateur_id', 'date_heure'], 'idx_logs_user_date');
            $table->index(['module', 'action'], 'idx_logs_module_action');
            $table->index(['entite_type', 'entite_id'], 'idx_logs_entite');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs');
    }
};