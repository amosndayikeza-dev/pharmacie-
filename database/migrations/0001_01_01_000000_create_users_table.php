<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table des utilisateurs du système.
 *
 * Rôles définis par le cahier des charges :
 *  - Administrateur : accès total
 *  - Pharmacien     : fournisseurs, rapports, achats
 *  - Vendeur        : encaissement uniquement
 *
 * Sécurité :
 *  - Mot de passe haché en Argon2id (configuré dans .env)
 *  - Limitation des tentatives de connexion (RateLimiter)
 *  - Journalisation des actions via la table `logs`
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // Identité
            $table->string('nom', 100);
            $table->string('prenom', 100);
            $table->string('email', 150)->unique();
            $table->timestamp('email_verified_at')->nullable();

            // Authentification
            $table->string('password');
            $table->rememberToken();

            // Rôle (RBAC)
            $table->enum('role', ['Administrateur', 'Pharmacien', 'Vendeur'])
                  ->default('Vendeur')
                  ->comment('Rôle déterminant les droits d\'accès');

            // Statut (permet de désactiver un compte sans le supprimer)
            $table->boolean('actif')->default(true);

            // Traçabilité
            $table->timestamp('date_de_creation')->useCurrent();
            $table->timestamp('derniere_connexion')->nullable();
            $table->timestamps();

            // Index pour les recherches fréquentes
            $table->index('role', 'idx_users_role');
            $table->index('actif', 'idx_users_actif');
        });

        // Tables Laravel par défaut (sessions, reset password)
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};