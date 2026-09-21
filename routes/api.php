<?php

use App\Http\Controllers\Api\V1\AuthController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\MedicamentController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\VeterinaireController;
use App\Http\Controllers\Api\V1\EspeceController;
use App\Http\Controllers\Api\V1\FournisseurController;
use App\Http\Controllers\Api\V1\ProprietaireController;
use App\Http\Controllers\Api\V1\AnimalController;
use App\Http\Controllers\Api\V1\OrdonnanceController;
use App\Http\Controllers\Api\V1\VaccinationController;
use App\Http\Controllers\Api\V1\LotController;
use App\Http\Controllers\Api\V1\AchatController;
use App\Http\Controllers\Api\V1\ReceptionController;
use App\Http\Controllers\Api\V1\VenteController;
use App\Http\Controllers\Api\V1\MouvementStockController;
use App\Http\Controllers\Api\V1\RapportJournalierController;
use App\Http\Controllers\Api\V1\LogController;
use App\Http\Controllers\Api\V1\ExportController;

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

            // ============================================================
        // ESPÈCES
        // ============================================================

        // --- Lecture (tous les rôles connectés) ---
        Route::prefix('especes')->name('especes.')->group(function () {
            Route::get('/',              [EspeceController::class, 'index'])->name('index');
            Route::get('/categories',    [EspeceController::class, 'categories'])->name('categories');
            Route::get('/{id}',          [EspeceController::class, 'show'])->whereNumber('id')->name('show');
        });

        // --- Écriture (Administrateur + Pharmacien) ---
        Route::middleware('role.api:Administrateur,Pharmacien')->prefix('especes')->name('especes.')->group(function () {
            Route::post('/',                  [EspeceController::class, 'store'])->name('store');
            Route::put('/{id}',               [EspeceController::class, 'update'])->whereNumber('id')->name('update');
            Route::patch('/{id}',             [EspeceController::class, 'update'])->whereNumber('id');
            Route::post('/{id}/toggle-actif', [EspeceController::class, 'toggleActif'])->whereNumber('id')->name('toggle.actif');
        });

        // --- Écriture sensible (Administrateur uniquement) ---
        Route::middleware('role.api:Administrateur')->prefix('especes')->name('especes.')->group(function () {
            Route::delete('/{id}',       [EspeceController::class, 'destroy'])->whereNumber('id')->name('destroy');
            Route::post('/{id}/restore', [EspeceController::class, 'restore'])->whereNumber('id')->name('restore');
        });

        // ============================================================
        // FOURNISSEURS
        // ============================================================

        // --- Lecture (tous les rôles connectés) ---
        Route::prefix('fournisseurs')->name('fournisseurs.')->group(function () {
            Route::get('/',              [FournisseurController::class, 'index'])->name('index');
            Route::get('/villes',        [FournisseurController::class, 'villes'])->name('villes');
            Route::get('/{id}',          [FournisseurController::class, 'show'])->whereNumber('id')->name('show');
        });

        // --- Écriture (Administrateur + Pharmacien) ---
        Route::middleware('role.api:Administrateur,Pharmacien')->prefix('fournisseurs')->name('fournisseurs.')->group(function () {
            Route::post('/',                  [FournisseurController::class, 'store'])->name('store');
            Route::put('/{id}',               [FournisseurController::class, 'update'])->whereNumber('id')->name('update');
            Route::patch('/{id}',             [FournisseurController::class, 'update'])->whereNumber('id');
            Route::post('/{id}/toggle-actif', [FournisseurController::class, 'toggleActif'])->whereNumber('id')->name('toggle.actif');
        });

        // --- Écriture sensible (Administrateur uniquement) ---
        Route::middleware('role.api:Administrateur')->prefix('fournisseurs')->name('fournisseurs.')->group(function () {
            Route::delete('/{id}',       [FournisseurController::class, 'destroy'])->whereNumber('id')->name('destroy');
            Route::post('/{id}/restore', [FournisseurController::class, 'restore'])->whereNumber('id')->name('restore');
        });


            // ============================================================
    // PROPRIÉTAIRES
    // ============================================================

    // --- Lecture (tous les rôles connectés) ---
    Route::prefix('proprietaires')->name('proprietaires.')->group(function () {
        Route::get('/',       [ProprietaireController::class, 'index'])->name('index');
        Route::get('/villes', [ProprietaireController::class, 'villes'])->name('villes');
        Route::get('/types',  [ProprietaireController::class, 'types'])->name('types');
        Route::get('/{id}',   [ProprietaireController::class, 'show'])
            ->whereNumber('id')
            ->name('show');
    });

    // --- Écriture (tous les rôles, car caisse incluse) ---
    Route::prefix('proprietaires')->name('proprietaires.')->group(function () {
        Route::post('/',      [ProprietaireController::class, 'store'])->name('store');
        Route::put('/{id}',   [ProprietaireController::class, 'update'])
            ->whereNumber('id')
            ->name('update');
        Route::patch('/{id}', [ProprietaireController::class, 'update'])
            ->whereNumber('id');
    });

    // --- Suppression (Administrateur uniquement) ---
    Route::middleware('role.api:Administrateur')
            ->prefix('proprietaires')
            ->name('proprietaires.')
            ->group(function () {
                Route::delete('/{id}',       [ProprietaireController::class, 'destroy'])
                    ->whereNumber('id')
                    ->name('destroy');
                Route::post('/{id}/restore', [ProprietaireController::class, 'restore'])
                    ->whereNumber('id')
                    ->name('restore');
        });

        // ============================================================
    // ANIMAUX
    // ============================================================

    // --- Lecture (tous les rôles connectés) ---
    Route::prefix('animaux')->name('animaux.')->group(function () {
        Route::get('/',        [AnimalController::class, 'index'])->name('index');
        Route::get('/stats',   [AnimalController::class, 'stats'])->name('stats');
        Route::get('/{id}',    [AnimalController::class, 'show'])
            ->whereNumber('id')
            ->name('show');
    });

    // --- Écriture (tous les rôles, car caisse incluse) ---
    Route::prefix('animaux')->name('animaux.')->group(function () {
        Route::post('/',       [AnimalController::class, 'store'])->name('store');
        Route::put('/{id}',    [AnimalController::class, 'update'])
            ->whereNumber('id')
            ->name('update');
        Route::patch('/{id}',  [AnimalController::class, 'update'])
            ->whereNumber('id');
    });

    // --- Suppression (Administrateur uniquement) ---
    Route::middleware('role.api:Administrateur')
        ->prefix('animaux')
        ->name('animaux.')
        ->group(function () {
            Route::delete('/{id}',       [AnimalController::class, 'destroy'])
                ->whereNumber('id')
                ->name('destroy');
            Route::post('/{id}/restore', [AnimalController::class, 'restore'])
                ->whereNumber('id')
                ->name('restore');
    });

        // ============================================================
    // ORDONNANCES
    // ============================================================

    // --- Lecture (tous les rôles connectés) ---
    Route::prefix('ordonnances')->name('ordonnances.')->group(function () {
        Route::get('/',     [OrdonnanceController::class, 'index'])->name('index');
        Route::get('/{id}', [OrdonnanceController::class, 'show'])
            ->whereNumber('id')
            ->name('show');
    });

    // --- Écriture (tous les rôles, caisse incluse) ---
    Route::prefix('ordonnances')->name('ordonnances.')->group(function () {
        Route::post('/',      [OrdonnanceController::class, 'store'])->name('store');
        Route::put('/{id}',   [OrdonnanceController::class, 'update'])
            ->whereNumber('id')
            ->name('update');
        Route::patch('/{id}', [OrdonnanceController::class, 'update'])
            ->whereNumber('id');
    });

    // --- Suppression (Administrateur uniquement) ---
    Route::middleware('role.api:Administrateur')
        ->prefix('ordonnances')
        ->name('ordonnances.')
        ->group(function () {
            Route::delete('/{id}', [OrdonnanceController::class, 'destroy'])
                ->whereNumber('id')
                ->name('destroy');
        });

        // ============================================================
    // VACCINATIONS
    // ============================================================

    // --- Lecture (tous les rôles connectés) ---
    Route::prefix('vaccinations')->name('vaccinations.')->group(function () {
        Route::get('/',                   [VaccinationController::class, 'index'])->name('index');
        Route::get('/rappels',            [VaccinationController::class, 'rappels'])->name('rappels');
        Route::get('/rappels-en-retard',  [VaccinationController::class, 'rappelsEnRetard'])->name('rappels.en.retard');
        Route::get('/{id}',               [VaccinationController::class, 'show'])
            ->whereNumber('id')
            ->name('show');
    });

    // --- Écriture (tous les rôles, caisse incluse) ---
    Route::prefix('vaccinations')->name('vaccinations.')->group(function () {
        Route::post('/',      [VaccinationController::class, 'store'])->name('store');
        Route::put('/{id}',   [VaccinationController::class, 'update'])
            ->whereNumber('id')
            ->name('update');
        Route::patch('/{id}', [VaccinationController::class, 'update'])
            ->whereNumber('id');
    });

    // --- Suppression (Administrateur uniquement) ---
    Route::middleware('role.api:Administrateur')
        ->prefix('vaccinations')
        ->name('vaccinations.')
        ->group(function () {
            Route::delete('/{id}', [VaccinationController::class, 'destroy'])
                ->whereNumber('id')
                ->name('destroy');
        });

        // ============================================================
    // LOTS & STOCK
    // ============================================================

    // --- Lecture (tous les rôles connectés) ---
    Route::prefix('lots')->name('lots.')->group(function () {
        Route::get('/',      [LotController::class, 'index'])->name('index');
        Route::get('/{id}',  [LotController::class, 'show'])
            ->whereNumber('id')
            ->name('show');
    });

    // --- Écriture (Administrateur + Pharmacien) ---
    Route::middleware('role.api:Administrateur,Pharmacien')
        ->prefix('lots')
        ->name('lots.')
        ->group(function () {
            Route::post('/', [LotController::class, 'store'])->name('store');
        });
    
        // ============================================================
    // ACHATS (Commandes fournisseurs)
    // ============================================================

    // --- Lecture (tous les rôles connectés) ---
    Route::prefix('achats')->name('achats.')->group(function () {
        Route::get('/',      [AchatController::class, 'index'])->name('index');
        Route::get('/{id}',  [AchatController::class, 'show'])
            ->whereNumber('id')
            ->name('show');
    });

    // --- Écriture (Administrateur + Pharmacien) ---
    Route::middleware('role.api:Administrateur,Pharmacien')
        ->prefix('achats')
        ->name('achats.')
        ->group(function () {
            Route::post('/',       [AchatController::class, 'store'])->name('store');
            Route::put('/{id}',    [AchatController::class, 'update'])
                ->whereNumber('id')
                ->name('update');
            Route::patch('/{id}',  [AchatController::class, 'update'])
                ->whereNumber('id');
            Route::delete('/{id}', [AchatController::class, 'destroy'])
                ->whereNumber('id')
                ->name('destroy');
        });

        // ============================================================
    // RÉCEPTIONS (Entrées de marchandises)
    // ============================================================

    // --- Lecture (tous les rôles connectés) ---
    Route::prefix('receptions')->name('receptions.')->group(function () {
        Route::get('/',     [ReceptionController::class, 'index'])->name('index');
        Route::get('/{id}', [ReceptionController::class, 'show'])
            ->whereNumber('id')
            ->name('show');
    });

    // --- Écriture (Administrateur + Pharmacien) ---
    Route::middleware('role.api:Administrateur,Pharmacien')
        ->prefix('receptions')
        ->name('receptions.')
        ->group(function () {
            Route::post('/',            [ReceptionController::class, 'store'])->name('store');
            Route::put('/{id}',         [ReceptionController::class, 'update'])
                ->whereNumber('id')
                ->name('update');
            Route::patch('/{id}',       [ReceptionController::class, 'update'])
                ->whereNumber('id');

            // ⚠️ ROUTE SPÉCIALE : validation = création des lots
            Route::post('/{id}/valider', [ReceptionController::class, 'valider'])
                ->whereNumber('id')
                ->name('valider');

            Route::delete('/{id}',      [ReceptionController::class, 'destroy'])
                ->whereNumber('id')
                ->name('destroy');
        });

            // ============================================================
        // VENTES (Caisse)
        // ============================================================

        // --- Lecture (tous les rôles connectés) ---
        Route::prefix('ventes')->name('ventes.')->group(function () {
            Route::get('/',     [VenteController::class, 'index'])->name('index');
            Route::get('/{id}', [VenteController::class, 'show'])
                ->whereNumber('id')
                ->name('show');
        });

        // --- Création (tous les rôles, c'est la caisse) ---
        Route::post('/ventes', [VenteController::class, 'store'])->name('ventes.store');

            // ============================================================
    // MOUVEMENTS DE STOCK (Audit — lecture seule)
    // ============================================================

        Route::prefix('mouvements-stock')->name('mouvements.stock.')->group(function () {
            Route::get('/',                [MouvementStockController::class, 'index'])->name('index');
            Route::get('/par-lot/{lotId}', [MouvementStockController::class, 'parLot'])
                ->whereNumber('lotId')
                ->name('par.lot');
            Route::get('/par-reference',   [MouvementStockController::class, 'parReference'])->name('par.reference');
            Route::get('/{id}',            [MouvementStockController::class, 'show'])
                ->whereNumber('id')
                ->name('show');
        });
    
        // ============================================================
    // RAPPORTS (Analyses — lecture seule + génération manuelle)
    // ============================================================

    Route::prefix('rapports')->name('rapports.')->group(function () {
        // Lecture (tous les rôles connectés)
        Route::get('/',          [RapportJournalierController::class, 'index'])->name('index');
        Route::get('/hebdo',     [RapportJournalierController::class, 'hebdo'])->name('hebdo');
        Route::get('/mensuel',   [RapportJournalierController::class, 'mensuel'])->name('mensuel');
        Route::get('/annuel',    [RapportJournalierController::class, 'annuel'])->name('annuel');
        Route::get('/{date}',    [RapportJournalierController::class, 'show'])
            ->where('date', '\d{4}-\d{2}-\d{2}')
            ->name('show');
    });

    // Génération manuelle (Administrateur + Pharmacien)
    Route::middleware('role.api:Administrateur,Pharmacien')
        ->prefix('rapports')
        ->name('rapports.')
        ->group(function () {
            Route::post('/generer', [RapportJournalierController::class, 'generer'])->name('generer');
        });
        // ============================================================
    // LOGS (Audit RGPD — Administrateur uniquement, lecture seule)
    // ============================================================

    Route::middleware('role.api:Administrateur')->prefix('logs')->name('logs.')->group(function () {
        Route::get('/',                     [LogController::class, 'index'])->name('index');
        Route::get('/par-entite',           [LogController::class, 'parEntite'])->name('par.entite');
        Route::get('/par-utilisateur/{id}', [LogController::class, 'parUtilisateur'])
            ->whereNumber('id')
            ->name('par.utilisateur');
        Route::get('/{id}',                 [LogController::class, 'show'])
            ->whereNumber('id')
            ->name('show');
    });

    Route::prefix('exports')->name('exports.')->group(function () {
        Route::get('/ventes',       [ExportController::class, 'ventes'])->name('ventes');
        Route::get('/stock',        [ExportController::class, 'stock'])->name('stock');
        Route::get('/lots-perimes', [ExportController::class, 'lotsPerimes'])->name('lots.perimes');
        Route::get('/rapport-pdf',  [ExportController::class, 'rapportPdf'])->name('rapport.pdf');
    });

    });
    
});