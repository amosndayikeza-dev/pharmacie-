<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\MedicamentController;
use App\Http\Controllers\Api\V1\AnimalController;
use App\Http\Controllers\Api\V1\ProprietaireController;
use App\Http\Controllers\Api\V1\VenteController;
use App\Http\Controllers\Api\V1\LotController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes API — LGO Pharmacie Vétérinaire
|--------------------------------------------------------------------------
|
| Toutes les routes sont préfixées par /api (config automatique Laravel).
| Version 1 : /api/v1/*
|
| Auth : Sanctum (Bearer token)
| Réponses : JSON uniquement
|
*/

Route::prefix('v1')->name('api.v1.')->group(function () {

    // ============================================================
    // ROUTES PUBLIQUES (pas de token)
    // ============================================================
    Route::post('/login',    [AuthController::class, 'login'])->name('login');
    Route::post('/register', [AuthController::class, 'register'])->name('register');

    // ============================================================
    // ROUTES PROTÉGÉES (token Sanctum requis)
    // ============================================================
    Route::middleware('auth:sanctum')->group(function () {

        // --- Authentification ---
        Route::get('/me',      [AuthController::class, 'me'])->name('me');
        Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
        Route::post('/refresh',[AuthController::class, 'refresh'])->name('refresh');

        // --- Catalogue (lecture : tous les rôles) ---
        Route::get('/medicaments',        [MedicamentController::class, 'index']);
        Route::get('/medicaments/{id}',   [MedicamentController::class, 'show']);

        // --- Animaux & Propriétaires (lecture : tous) ---
        Route::get('/animaux',            [AnimalController::class, 'index']);
        Route::get('/animaux/{id}',       [AnimalController::class, 'show']);
        Route::get('/proprietaires',      [ProprietaireController::class, 'index']);
        Route::get('/proprietaires/{id}', [ProprietaireController::class, 'show']);

        // --- Lots (lecture : tous, FEFO) ---
        Route::get('/lots/fefo/{medicamentId}', [LotController::class, 'fefo']);

        // --- Ventes (création : tous les rôles connectés) ---
        Route::post('/ventes',            [VenteController::class, 'store']);
        Route::get('/ventes',             [VenteController::class, 'index']);
        Route::get('/ventes/{id}',        [VenteController::class, 'show']);

        // ============================================================
        // ROUTES ADMINISTRATEUR UNIQUEMENT
        // ============================================================
        Route::middleware('role.api:Administrateur')->group(function () {
            Route::post('/medicaments',          [MedicamentController::class, 'store']);
            Route::put('/medicaments/{id}',      [MedicamentController::class, 'update']);
            Route::delete('/medicaments/{id}',   [MedicamentController::class, 'destroy']);

            Route::post('/animaux',              [AnimalController::class, 'store']);
            Route::put('/animaux/{id}',          [AnimalController::class, 'update']);
            Route::delete('/animaux/{id}',       [AnimalController::class, 'destroy']);

            Route::post('/proprietaires',        [ProprietaireController::class, 'store']);
            Route::put('/proprietaires/{id}',    [ProprietaireController::class, 'update']);
            Route::delete('/proprietaires/{id}', [ProprietaireController::class, 'destroy']);
        });

        // ============================================================
        // ROUTES ADMINISTRATEUR + PHARMACIEN
        // ============================================================
        Route::middleware('role.api:Administrateur,Pharmacien')->group(function () {
            // Achats, réceptions, rapports
            // Route::apiResource('achats', AchatController::class);
            // Route::apiResource('receptions', ReceptionController::class);
        });
    });
});