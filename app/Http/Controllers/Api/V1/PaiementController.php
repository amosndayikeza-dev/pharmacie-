<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StorePaiementRequest;
use App\Http\Resources\PaiementResource;
use App\Models\Paiement;
use App\Services\PaiementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des paiements.
 *
 * ⚠️ INSERT-ONLY : pas d'update, pas de destroy.
 */
class PaiementController extends Controller
{
    public function __construct(
        private PaiementService $service
    ) {}

    /**
     * Liste paginée des paiements.
     * GET /api/v1/paiements
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Paiement::query()
            ->with('vente')
            ->when($request->filled('vente_id'), fn ($q) => $q->where('vente_id', $request->vente_id))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when($request->filled('date_debut'), fn ($q) => $q->whereDate('created_at', '>=', $request->date_debut))
            ->when($request->filled('date_fin'), fn ($q) => $q->whereDate('created_at', '<=', $request->date_fin))
            ->orderBy('created_at', 'desc');

        return PaiementResource::collection(
            $query->paginate($request->input('per_page', 20))
        );
    }

    /**
     * Détail d'un paiement.
     * GET /api/v1/paiements/{id}
     */
    public function show(int $id): JsonResponse
    {
        $paiement = Paiement::with('vente')->findOrFail($id);

        return response()->json([
            'data' => new PaiementResource($paiement),
        ]);
    }

    /**
     * Ajouter un paiement à une vente existante.
     * POST /api/v1/paiements
     */
    public function store(StorePaiementRequest $request): JsonResponse
    {
        $paiement = $this->service->ajouter($request->validated());

        return response()->json([
            'message' => 'Paiement enregistré avec succès.',
            'data'    => new PaiementResource($paiement->load('vente')),
        ], 201);
    }

    // ⚠️ PAS de update() ni destroy() — insert-only
}