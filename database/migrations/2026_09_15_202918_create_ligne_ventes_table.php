<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lignes de vente.
 *
 * PRINCIPE DU COÛT FIGÉ :
 *   Les colonnes prix_vente_ttc_unitaire, prix_achat_ht_unitaire_fige
 *   et taux_tva sont IMMUABLES. Elles reflètent l'état du prix au
 *   moment exact de la vente et ne doivent jamais être modifiées,
 *   même si le médicament change de prix plus tard.
 *
 * Cette règle est appliquée côté applicatif (modèle Eloquent) ET
 * peut être renforcée par un trigger SQL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ligne_ventes', function (Blueprint $table) {
            $table->id();

            // Relations
            $table->foreignId('vente_id')
                  ->constrained('ventes')
                  ->cascadeOnDelete()
                  ->comment('Vente parente');
            $table->foreignId('lot_id')
                  ->constrained('lots')
                  ->restrictOnDelete()
                  ->comment('Lot précis dont provient le médicament (FEFO)');
            $table->foreignId('medicament_id')
                  ->constrained('medicaments')
                  ->restrictOnDelete()
                  ->comment('Médicament vendu (dénormalisation pour requêtes rapides)');

            // Quantité
            $table->unsignedInteger('quantite')
                  ->comment('Quantité vendue depuis ce lot');

            // === PRIX FIGÉS (IMMUABLES) ===
            $table->decimal('prix_vente_ttc_unitaire', 10, 2)
                  ->comment('Prix de vente TTC unitaire au moment de la vente (IMMUABLE)');
            $table->decimal('prix_achat_ht_unitaire_fige', 10, 2)
                  ->comment('Coût d\'achat HT unitaire au moment de la vente (IMMUABLE)');
            $table->decimal('taux_tva', 5, 2)
                  ->comment('Taux de TVA appliqué au moment de la vente');

            // Montants calculés (pour éviter les recalculs)
            $table->decimal('montant_ht', 10, 2);
            $table->decimal('montant_tva', 10, 2);
            $table->decimal('montant_ttc', 10, 2);

            // Marge brute (calculée et figée)
            $table->decimal('marge_brute', 10, 2)
                  ->comment('Marge brute = (prix_vente_ttc - prix_achat_ht) * quantite');

            // Traçabilité
            $table->timestamps();

            // Index
            $table->index(['lot_id', 'vente_id'], 'idx_lignes_lot_vente');
            $table->index('medicament_id', 'idx_lignes_medicament');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ligne_ventes');
    }
};