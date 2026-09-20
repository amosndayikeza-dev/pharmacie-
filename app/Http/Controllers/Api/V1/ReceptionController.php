<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreReceptionRequest;
use App\Http\Requests\Api\V1\UpdateReceptionRequest;
use App\Http\Resources\ReceptionResource;
use App\Models\Reception;
use App\Services\ReceptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des réceptions.
 *
 * Workflow en 2 étapes :
 *   1. POST /receptions              → crée en brouillon
 *   2. POST /receptions/{id}/valider → crée les lots + stocks
 */
class ReceptionController extends Controller
{
    public function __construct(
        private ReceptionService $service
    ) {}

    /**
     * Liste paginée des réceptions.
     * GET /api/v1/receptions
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Reception::query()
            ->with(['fournisseur', 'utilisateur', 'achat'])
            ->when($request->filled('fournisseur_id'), fn ($q) => $q->where('fournisseur_id', $request->fournisseur_id))
            ->when($request->filled('achat_id'), fn ($q) => $q->where('achat_id', $request->achat_id))
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->statut))
            ->when($request->filled('search'), fn ($q) => $q->where('numero_reception', 'like', "%{$request->search}%"))
            ->orderBy('date_reception', 'desc');

        return ReceptionResource::collection(
            $query->paginate($request->input('per_page', 20))
        );
    }

    /**
     * Détail d'une réception.
     * GET /api/v1/receptions/{id}
     */
    public function show(int $id): JsonResponse
    {
        $reception = Reception::with(['fournisseur', 'utilisateur', 'achat', 'lignes.medicament'])
            ->findOrFail($id);

        return response()->json([
            'data' => new ReceptionResource($reception),
        ]);
    }

    /**
     * Créer une réception (brouillon).
     * POST /api/v1/receptions
     */
    public function store(StoreReceptionRequest $request): JsonResponse
    {
        $reception = $this->service->creer(
            $request->validated(),
            $request->user()->id
        );

        $reception->load(['fournisseur', 'utilisateur', 'achat', 'lignes.medicament']);

        return response()->json([
            'message' => 'Réception créée en brouillon. Validez-la pour créer les lots.',
            'data'    => new ReceptionResource($reception),
        ], 201);
    }

    /**
     * Modifier une réception (brouillon uniquement).
     * PUT /api/v1/receptions/{id}
     */
    public function update(UpdateReceptionRequest $request, int $id): JsonResponse
    {
        $reception = Reception::findOrFail($id);
        $reception = $this->service->modifier($reception, $request->validated());

        return response()->json([
            'message' => 'Réception modifiée avec succès.',
            'data'    => new ReceptionResource($reception->fresh(['fournisseur', 'utilisateur', 'achat', 'lignes.medicament'])),
        ]);
    }

    /**
     * Valider une réception → CRÉE LES LOTS.
     * POST /api/v1/receptions/{id}/valider
     */
    public function valider(int $id): JsonResponse
    {
        $reception = Reception::findOrFail($id);
        $reception = $this->service->valider($reception);

        return response()->json([
            'message' => 'Réception validée. Les lots et mouvements de stock ont été créés.',
            'data'    => new ReceptionResource($reception->fresh(['fournisseur', 'utilisateur', 'achat', 'lignes.medicament'])),
        ]);
    }

    /**
     * Supprimer une réception (brouillon uniquement).
     * DELETE /api/v1/receptions/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $reception = Reception::findOrFail($id);

        if ($reception->statut !== 'brouillon') {
            return response()->json([
                'message' => 'Impossible de supprimer une réception déjà validée.',
            ], 409);
        }

        $reception->delete();

        return response()->json([
            'message' => 'Réception supprimée.',
        ]);
    }
}