<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Lots physiques de médicaments.
 *
 * RÈGLE FEFO (First Expired, First Out) :
 *   Le stock disponible d'un médicament = somme des quantités restantes
 *   de ses lots non périmés. La vente décrémente en priorité le lot
 *   dont la date de péremption est la plus proche.
 *
 * CONTRAINTES :
 *   - quantite_restante >= 0 (CHECK)
 *   - index composite (medicament_id, date_peremption, quantite_restante)
 *     pour garantir la performance du FEFO.
 *
 * AUDIT :
 *   Chaque modification de quantite_restante doit être accompagnée d'un
 *   enregistrement dans `mouvements_stock` (insert-only).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lots', function (Blueprint $table) {
            $table->id();

            // Relations
            $table->foreignId('medicament_id')
                  ->constrained('medicaments')
                  ->restrictOnDelete()
                  ->comment('Médicament concerné');
            $table->foreignId('fournisseur_id')
                  ->constrained('fournisseurs')
                  ->restrictOnDelete()
                  ->comment('Fournisseur ayant livré ce lot');

            // Identification du lot
            $table->string('numero_lot', 100)
                  ->comment('Numéro de lot du fabricant');
            $table->date('date_peremption')
                  ->comment('Date de péremption (indexée pour le FEFO)');
            $table->date('date_fabrication')->nullable();

            // Prix d'achat (figé à la réception, ne change jamais)
            $table->decimal('prix_achat_ht_unitaire', 10, 2)
                  ->comment('Prix d\'achat HT unitaire, immuable');

            // Quantités
            $table->unsignedInteger('quantite_initiale')
                  ->comment('Quantité reçue à la création du lot');
            $table->unsignedInteger('quantite_restante')
                  ->default(0)
                  ->comment('Quantité disponible (décrémentée par les ventes)');

            // Traçabilité
            $table->timestamps();

            // === INDEX CRITIQUES ===
            // Index FEFO : recherche par médicament, trié par péremption
            $table->index(
                ['medicament_id', 'date_peremption', 'quantite_restante'],
                'idx_lots_fefo'
            );
            // Index pour les alertes de péremption
            $table->index('date_peremption', 'idx_lots_peremption');
            // Index pour retrouver tous les lots d'un fournisseur
            $table->index('fournisseur_id', 'idx_lots_fournisseur');
            // Unicité : un même numéro de lot pour un même médicament
            $table->unique(
                ['medicament_id', 'numero_lot', 'date_peremption'],
                'uk_lots_medicament_lot_peremption'
            );
        });

        // Contrainte CHECK : la quantité restante ne peut jamais être négative
        DB::statement('ALTER TABLE lots ADD CONSTRAINT chk_lots_quantite_positive CHECK (quantite_restante >= 0)');
        DB::statement('ALTER TABLE lots ADD CONSTRAINT chk_lots_quantite_initiale CHECK (quantite_initiale >= quantite_restante)');
    }

    public function down(): void
    {
        Schema::dropIfExists('lots');
    }
};