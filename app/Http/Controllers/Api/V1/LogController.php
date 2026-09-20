<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\LogResource;
use App\Models\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des logs (audit RGPD, lecture seule).
 */
class LogController extends Controller
{
    /**
     * Liste paginée des logs.
     * GET /api/v1/logs
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Log::query()
            ->with('utilisateur')
            ->when($request->filled('utilisateur_id'), fn ($q) => $q->where('utilisateur_id', $request->utilisateur_id))
            ->when($request->filled('module'), fn ($q) => $q->where('module', $request->module))
            ->when($request->filled('action'), fn ($q) => $q->where('action', 'like', "%{$request->action}%"))
            ->when($request->filled('entite_type'), fn ($q) => $q->where('entite_type', $request->entite_type))
            ->when($request->filled('entite_id'), fn ($q) => $q->where('entite_id', $request->entite_id))
            ->when($request->filled('date_debut'), fn ($q) => $q->whereDate('date_heure', '>=', $request->date_debut))
            ->when($request->filled('date_fin'), fn ($q) => $q->whereDate('date_heure', '<=', $request->date_fin))
            ->orderBy('date_heure', 'desc');

        return LogResource::collection(
            $query->paginate($request->input('per_page', 50))
        );
    }

    /**
     * Détail d'un log.
     * GET /api/v1/logs/{id}
     */
    public function show(int $id): JsonResponse
    {
        $log = Log::with('utilisateur')->findOrFail($id);

        return response()->json([
            'data' => new LogResource($log),
        ]);
    }

    /**
     * Historique des actions sur une entité.
     * GET /api/v1/logs/entite?entite_type=App\Models\Vente&entite_id=5
     */
    public function parEntite(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'entite_type' => ['required', 'string'],
            'entite_id'   => ['required', 'integer'],
        ]);

        $logs = Log::query()
            ->with('utilisateur')
            ->where('entite_type', $request->entite_type)
            ->where('entite_id', $request->entite_id)
            ->orderBy('date_heure', 'desc')
            ->get();

        return LogResource::collection($logs);
    }

    /**
     * Historique des actions d'un utilisateur.
     * GET /api/v1/logs/utilisateur/{id}
     */
    public function parUtilisateur(int $utilisateurId): AnonymousResourceCollection
    {
        $logs = Log::query()
            ->with('utilisateur')
            ->where('utilisateur_id', $utilisateurId)
            ->orderBy('date_heure', 'desc')
            ->limit(200)
            ->get();

        return LogResource::collection($logs);
    }
}