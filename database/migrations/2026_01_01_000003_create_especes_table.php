<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Référentiel des espèces animales.
 *
 * Catégories :
 *   - compagnie : chien, chat, oiseau...
 *   - élevage   : bovin, caprin, ovin, porcin...
 *   - volaille  : poule, canard, dinde...
 *   - equin     : cheval, âne, mulet...
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('especes', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 100)->unique()
                  ->comment('Nom commun (Chien, Bovin...)');
            $table->string('nom_scientifique', 150)->nullable()
                  ->comment('Nom scientifique (Canis lupus...)');
            $table->enum('categorie', ['compagnie', 'elevage', 'volaille', 'equin', 'autre'])
                  ->default('compagnie')
                  ->comment('Grande catégorie d\'espèce');
            $table->text('description')->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index('categorie', 'idx_especes_categorie');
            $table->index('actif', 'idx_especes_actif');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('especes');
    }
};