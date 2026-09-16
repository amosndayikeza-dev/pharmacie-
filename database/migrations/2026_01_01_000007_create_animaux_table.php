<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Animaux (patients de la pharmacie vétérinaire).
 *
 * Chaque animal appartient à un propriétaire (payeur).
 * Un animal peut avoir un historique médical (vaccinations, ordonnances).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('animaux', function (Blueprint $table) {
            $table->id();

            // Relations
            $table->foreignId('proprietaire_id')
                  ->constrained('proprietaires')
                  ->cascadeOnDelete()
                  ->comment('Propriétaire de l\'animal');
            $table->foreignId('espece_id')
                  ->constrained('especes')
                  ->restrictOnDelete()
                  ->comment('Espèce de l\'animal');

            // Identification
            $table->string('nom', 100)->nullable()
                  ->comment('Nom de l\'animal (compagnie) ou identifiant (bétail)');
            $table->string('numero_identification', 100)->nullable()
                  ->comment('Boucle, puce électronique, tatouage...');
            $table->enum('sexe', ['M', 'F', 'Inconnu'])->default('Inconnu');
            $table->date('date_naissance')->nullable();

            // Caractéristiques physiques
            $table->string('race', 100)->nullable();
            $table->string('couleur', 100)->nullable();
            $table->decimal('poids_kg', 8, 2)->nullable()
                  ->comment('Poids en kilogrammes (important pour la posologie)');
            $table->string('taille', 50)->nullable();

            // État
            $table->boolean('sterilise')->default(false);
            $table->boolean('gestante')->default(false);
            $table->boolean('allaitante')->default(false);
            $table->boolean('vivant')->default(true)
                  ->comment('false = animal décédé ou vendu');

            // Notes médicales
            $table->text('allergies')->nullable();
            $table->text('antecedents')->nullable();
            $table->text('notes')->nullable();

            // Traçabilité
            $table->timestamps();
            $table->softDeletes();

            // Index
            $table->index('proprietaire_id', 'idx_animaux_proprietaire');
            $table->index('espece_id', 'idx_animaux_espece');
            $table->index('numero_identification', 'idx_animaux_identification');
            $table->index('vivant', 'idx_animaux_vivant');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('animaux');
    }
};