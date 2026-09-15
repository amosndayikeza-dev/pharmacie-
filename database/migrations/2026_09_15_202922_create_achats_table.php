<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Commandes d'achat auprès des fournisseurs.
 *
 * SÉPARATION STRICTE avec les réceptions :
 *   - `achats`      : commande passée (intention)
 *   - `receptions`  : réception physique (réalité)
 *
 * Une commande peut être livrée en PLUSIEURS fois (livraisons partielles).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('achats', function (Blueprint $table) {
            $table->id();

            // Numéro de commande
            $table->string('numero_commande', 50)->unique();

            // Relations
            $table->foreignId('fournisseur_id')
                  ->constrained('fournisseurs')
                  ->restrictOnDelete();
            $table->foreignId('utilisateur_id')
                  ->constrained('users')
                  ->restrictOnDelete()
                  ->comment('Utilisateur ayant passé la commande');

            // Dates
            $table->date('date_commande');
            $table->date('date_livraison_prevue')->nullable();

            // Montants
            $table->decimal('montant_total_ht', 12, 2)->default(0);
            $table->decimal('montant_total_tva', 12, 2)->default(0);
            $table->decimal('montant_total_ttc', 12, 2)->default(0);

            // Statut
            $table->enum('statut', [
                'brouillon',
                'envoyee',
                'partiellement_livree',
                'livree',
                'annulee',
            ])->default('brouillon');

            // Notes
            $table->text('notes')->nullable();

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            // Index
            $table->index(['fournisseur_id', 'statut'], 'idx_achats_fournisseur_statut');
            $table->index('date_commande', 'idx_achats_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('achats');
    }
};