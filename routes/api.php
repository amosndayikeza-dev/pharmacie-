<?php

use App\Http\Controllers\Api\V1\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\MedicamentController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\VeterinaireController;

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

        // Authentification
        Route::get('/me',          [AuthController::class, 'me'])->name('me');
        Route::post('/logout',     [AuthController::class, 'logout'])->name('logout');
        Route::post('/logout-all', [AuthController::class, 'logoutAll'])->name('logout.all');
        Route::post('/refresh',    [AuthController::class, 'refresh'])->name('refresh');
        Route::post('/me/change-password', [UserController::class, 'changePassword'])->name('me.change-password');

        // Dashboard 

        Route::prefix('dashboard')->name('dashboard.')->group(function () {
            Route::get('/',       [DashboardController::class, 'index'])->name('index');
            Route::get('/stats',  [DashboardController::class, 'stats'])->name('stats');
            Route::get('/alertes',[DashboardController::class, 'alertes'])->name('alertes');
        });


        // --- Lecture (tous les rôles connectés) ---
        Route::prefix('medicaments')->name('medicaments.')->group(function () {
            Route::get('/',              [MedicamentController::class, 'index'])->name('index');
            Route::get('/categories',    [MedicamentController::class, 'categories'])->name('categories');
            Route::get('/alertes-stock', [MedicamentController::class, 'alertesStock'])->name('alertes.stock');
            Route::get('/{id}',          [MedicamentController::class, 'show'])->whereNumber('id')->name('show');
        });

        // --- Écriture (Administrateur uniquement) ---
        Route::middleware('role.api:Administrateur')->prefix('medicaments')->name('medicaments.')->group(function () {
            Route::post('/',                  [MedicamentController::class, 'store'])->name('store');
            Route::put('/{id}',               [MedicamentController::class, 'update'])->whereNumber('id')->name('update');
            Route::patch('/{id}',             [MedicamentController::class, 'update'])->whereNumber('id');
            Route::delete('/{id}',            [MedicamentController::class, 'destroy'])->whereNumber('id')->name('destroy');
            Route::post('/{id}/toggle-actif', [MedicamentController::class, 'toggleActif'])->whereNumber('id')->name('toggle.actif');
            Route::post('/{id}/restore',      [MedicamentController::class, 'restore'])->whereNumber('id')->name('restore');
        });

        
        // ============================================================
        // GESTION DES UTILISATEURS — Administrateur uniquement
        // ============================================================
        Route::middleware('role.api:Administrateur')->prefix('users')->name('users.')->group(function () {
            Route::get('/',                   [UserController::class, 'index'])->name('index');
            Route::get('/{id}',               [UserController::class, 'show'])->whereNumber('id')->name('show');
            Route::post('/',                  [UserController::class, 'store'])->name('store');
            Route::put('/{id}',               [UserController::class, 'update'])->whereNumber('id')->name('update');
            Route::patch('/{id}',             [UserController::class, 'update'])->whereNumber('id');
            Route::delete('/{id}',            [UserController::class, 'destroy'])->whereNumber('id')->name('destroy');
            Route::post('/{id}/toggle-actif', [UserController::class, 'toggleActif'])->whereNumber('id')->name('toggle.actif');
            Route::post('/{id}/reset-password', [UserController::class, 'resetPassword'])->whereNumber('id')->name('reset.password');
        });

        // --- Lecture (tous les rôles connectés) ---
        Route::prefix('veterinaires')->name('veterinaires.')->group(function () {
            Route::get('/',               [VeterinaireController::class, 'index'])->name('index');
            Route::get('/specialites',    [VeterinaireController::class, 'specialites'])->name('specialites');
            Route::get('/{id}',           [VeterinaireController::class, 'show'])->whereNumber('id')->name('show');
        });

        // --- Écriture (Admin + Pharmacien) ---
        Route::middleware('role.api:Administrateur,Pharmacien')->prefix('veterinaires')->name('veterinaires.')->group(function () {
            Route::post('/',                    [VeterinaireController::class, 'store'])->name('store');
            Route::put('/{id}',                 [VeterinaireController::class, 'update'])->whereNumber('id')->name('update');
            Route::patch('/{id}',               [VeterinaireController::class, 'update'])->whereNumber('id');
            Route::post('/{id}/toggle-actif',   [VeterinaireController::class, 'toggleActif'])->whereNumber('id')->name('toggle.actif');
        });

        // --- Écriture sensible (Administrateur uniquement) ---
        Route::middleware('role.api:Administrateur')->prefix('veterinaires')->name('veterinaires.')->group(function () {
            Route::delete('/{id}',         [VeterinaireController::class, 'destroy'])->whereNumber('id')->name('destroy');
            Route::post('/{id}/restore',   [VeterinaireController::class, 'restore'])->whereNumber('id')->name('restore');
        });
    });
});