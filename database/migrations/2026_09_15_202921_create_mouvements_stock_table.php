<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal des mouvements de stock (AUDIT).
 *
 * PRINCIPE INSERT-ONLY :
 *   Aucun mouvement n'est modifié ni supprimé. Chaque entrée/sortie
 *   de stock crée une nouvelle ligne.
 *
 * Types de mouvements :
 *   - achat      : entrée via réception fournisseur
 *   - vente      : sortie via vente
 *   - perte      : destruction, casse, périmé
 *   - ajustement : correction d'inventaire
 *
 * Le champ `quantite` est POSITIF pour une entrée, NÉGATIF pour une sortie.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mouvements_stock', function (Blueprint $table) {
            $table->id();

            // Relation
            $table->foreignId('lot_id')
                  ->constrained('lots')
                  ->restrictOnDelete()
                  ->comment('Lot concerné par le mouvement');

            // Date du mouvement
            $table->dateTime('date_heure')
                  ->comment('Horodatage précis du mouvement');

            // Quantité (positif = entrée, négatif = sortie)
            $table->integer('quantite')
                  ->comment('Positif = entrée, négatif = sortie');

            // Type de mouvement
            $table->enum('type', ['achat', 'vente', 'perte', 'ajustement'])
                  ->comment('Nature du mouvement');

            // Référence vers l'entité source (vente_id, reception_id, etc.)
            $table->unsignedBigInteger('reference_id')->nullable()
                  ->comment('ID de l\'entité source (vente, réception...)');
            $table->string('reference_type', 50)->nullable()
                  ->comment('Type de l\'entité source');

            // Utilisateur ayant effectué le mouvement
            $table->foreignId('utilisateur_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            // Motif (utile pour pertes et ajustements)
            $table->text('motif')->nullable();

            // Traçabilité
            $table->timestamps();

            // Index
            $table->index(['lot_id', 'date_heure'], 'idx_mvt_lot_date');
            $table->index('type', 'idx_mvt_type');
            $table->index(['reference_type', 'reference_id'], 'idx_mvt_reference');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mouvements_stock');
    }
};