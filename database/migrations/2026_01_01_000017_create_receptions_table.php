<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Réceptions physiques de marchandises.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receptions', function (Blueprint $table) {
            $table->id();
            $table->string('numero_reception', 50)->unique();
            $table->foreignId('achat_id')->nullable()->constrained('achats')->nullOnDelete();
            $table->foreignId('fournisseur_id')->constrained('fournisseurs')->restrictOnDelete();
            $table->foreignId('utilisateur_id')->constrained('users')->restrictOnDelete();
            $table->date('date_reception');
            $table->string('numero_bon_livraison', 100)->nullable();
            $table->decimal('montant_total_ht', 12, 2)->default(0);
            $table->decimal('montant_total_tva', 12, 2)->default(0);
            $table->decimal('montant_total_ttc', 12, 2)->default(0);
            $table->enum('statut', ['brouillon', 'validee', 'annulee'])->default('brouillon');
            $table->text('observations')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['fournisseur_id', 'date_reception'], 'idx_receptions_fournisseur_date');
            $table->index('achat_id', 'idx_receptions_achat');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receptions');
    }
};