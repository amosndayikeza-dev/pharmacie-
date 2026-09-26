<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Règlements de crédit — Encaissements ultérieurs de dettes clients.
 *
 * Un client qui a acheté à crédit peut revenir payer sa dette.
 * Chaque paiement partiel est enregistré ici.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reglements_credits', function (Blueprint $table) {
            $table->id();

            // Le paiement de type "credit" concerné
            $table->foreignId('paiement_id')
                  ->constrained('paiements')
                  ->cascadeOnDelete()
                  ->comment('Paiement de type credit à régler');

            // Montant du règlement
            $table->decimal('montant', 12, 2)
                  ->comment('Montant encaissé');

            // Qui a encaissé
            $table->foreignId('utilisateur_id')
                  ->constrained('users')
                  ->restrictOnDelete();

            // Mode de règlement
            $table->enum('mode', ['especes', 'carte', 'mobile_money'])
                  ->default('especes');

            // Horodatage
            $table->dateTime('date_heure');

            // Notes
            $table->text('notes')->nullable();

            $table->timestamps();

            // Index
            $table->index(['paiement_id', 'date_heure'], 'idx_reglements_paiement_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reglements_credits');
    }
};