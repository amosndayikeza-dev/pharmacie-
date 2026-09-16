<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Commandes d'achat fournisseurs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('achats', function (Blueprint $table) {
            $table->id();
            $table->string('numero_commande', 50)->unique();
            $table->foreignId('fournisseur_id')->constrained('fournisseurs')->restrictOnDelete();
            $table->foreignId('utilisateur_id')->constrained('users')->restrictOnDelete();
            $table->date('date_commande');
            $table->date('date_livraison_prevue')->nullable();
            $table->decimal('montant_total_ht', 12, 2)->default(0);
            $table->decimal('montant_total_tva', 12, 2)->default(0);
            $table->decimal('montant_total_ttc', 12, 2)->default(0);
            $table->enum('statut', ['brouillon', 'envoyee', 'partiellement_livree', 'livree', 'annulee'])
                  ->default('brouillon');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['fournisseur_id', 'statut'], 'idx_achats_fournisseur_statut');
            $table->index('date_commande', 'idx_achats_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('achats');
    }
};