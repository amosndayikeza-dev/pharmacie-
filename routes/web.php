<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes Web
|--------------------------------------------------------------------------
|
| Routes Web minimales : page d'accueil informative, exports, webhooks.
| Tout le reste passe par l'API (/api/v1/*).
|
*/

// Page d'accueil informative
Route::get('/', fn () => response()->json([
    'app'     => 'LGO Pharmacie Vétérinaire',
    'version' => '1.0.0',
    'api'     => '/api/v1',
]));

// Les exports et webhooks viendront plus tard :
// Route::get('/exports/ventes', [ExportController::class, 'ventes']);
// Route::post('/webhooks/lumicash', [WebhookController::class, 'lumicash']);