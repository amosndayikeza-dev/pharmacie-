<?php

use App\Http\Controllers\Api\V1\AuthController;
use Illuminate\Support\Facades\Route;

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

        // Les routes métier viendront ici...
    });
});