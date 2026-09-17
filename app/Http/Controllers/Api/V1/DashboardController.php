<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;

/**
 * Controller API du tableau de bord.
 *
 * Toutes les statistiques sont calculées dans DashboardService.
 */
class DashboardController extends Controller
{
    public function __construct(
        private DashboardService $dashboardService
    ) {}

    /**
     * Dashboard complet (1 seul appel).
     *
     * GET /api/v1/dashboard
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboardService->getAll(),
        ]);
    }

    /**
     * Statistiques globales uniquement.
     *
     * GET /api/v1/dashboard/stats
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'data' => $this->dashboardService->getStats(),
        ]);
    }

    /**
     * Alertes stock + péremption.
     *
     * GET /api/v1/dashboard/alertes
     */
    public function alertes(): JsonResponse
    {
        return response()->json([
            'data' => [
                'stock'      => $this->dashboardService->getAlertesStock(),
                'peremption' => $this->dashboardService->getAlertesPeremption(),
            ],
        ]);
    }
}