<?php

use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\ExportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes Web
|--------------------------------------------------------------------------
|
| Routes servies avec session + cookies (Blade, exports PDF/Excel...).
| L'authentification se fait via le middleware 'auth' (session).
|
*/

// Page d'accueil publique
Route::get('/', function () {
    return view('welcome');
});

// Routes protégées (session)
Route::middleware(['auth'])->group(function () {

    // Dashboard admin (Blade)
    Route::get('/admin', [DashboardController::class, 'index'])
        ->name('admin.dashboard');

    // Exports (fichiers téléchargeables)
    Route::prefix('exports')->name('exports.')->group(function () {
        Route::get('/ventes', [ExportController::class, 'ventes'])
            ->name('ventes');
        Route::get('/stock', [ExportController::class, 'stock'])
            ->name('stock');
        Route::get('/rapport/{date}', [ExportController::class, 'rapport'])
            ->name('rapport');
    });
});