<?php

use App\Http\Controllers\Api\V1\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\DashboardController;

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

        // Dashboard 

        Route::prefix('dashboard')->name('dashboard.')->group(function () {
            Route::get('/',       [DashboardController::class, 'index'])->name('index');
            Route::get('/stats',  [DashboardController::class, 'stats'])->name('stats');
            Route::get('/alertes',[DashboardController::class, 'alertes'])->name('alertes');
        });
    });
});