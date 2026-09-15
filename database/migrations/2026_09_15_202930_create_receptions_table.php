<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Réceptions physiques de marchandises.
 *
 * Une réception correspond à un bon de livraison reçu.
 * Une même commande (`achats`) peut avoir plusieurs réceptions.
 *
 * Chaque ligne de réception (`ligne_receptions`) crée un LOT physique.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receptions', function (Blueprint $table) {
            $table->id();

            // Numéro de réception
            $table->string('numero_reception', 50)->unique();

            // Relations
            $table->foreignId('achat_id')
                  ->nullable()
                  ->constrained('achats')
                  ->nullOnDelete()
                  ->comment('Commande d\'origine (nullable si réception hors commande)');
            $table->foreignId('fournisseur_id')
                  ->constrained('fournisseurs')
                  ->restrictOnDelete();
            $table->foreignId('utilisateur_id')
                  ->constrained('users')
                  ->restrictOnDelete()
                  ->comment('Utilisateur ayant réceptionné');

            // Dates
            $table->date('date_reception');
            $table->string('numero_bon_livraison', 100)->nullable()
                  ->comment('Numéro du bon de livraison fournisseur');

            // Montants
            $table->decimal('montant_total_ht', 12, 2)->default(0);
            $table->decimal('montant_total_tva', 12, 2)->default(0);
            $table->decimal('montant_total_ttc', 12, 2)->default(0);

            // Statut
            $table->enum('statut', ['brouillon', 'validee', 'annulee'])
                  ->default('brouillon');

            // Notes
            $table->text('observations')->nullable();

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            // Index
            $table->index(['fournisseur_id', 'date_reception'], 'idx_receptions_fournisseur_date');
            $table->index('achat_id', 'idx_receptions_achat');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receptions');
    }
};