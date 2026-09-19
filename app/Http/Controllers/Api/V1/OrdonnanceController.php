<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreOrdonnanceRequest;
use App\Http\Requests\Api\V1\UpdateOrdonnanceRequest;
use App\Http\Resources\OrdonnanceResource;
use App\Models\Ordonnance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des ordonnances vétérinaires.
 */
class OrdonnanceController extends Controller
{
    /**
     * Liste paginée des ordonnances.
     *
     * GET /api/v1/ordonnances
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Ordonnance::query()
            ->with(['animal', 'veterinaire'])
            ->when($request->filled('animal_id'), function ($q) use ($request) {
                $q->where('animal_id', $request->animal_id);
            })
            ->when($request->filled('veterinaire_id'), function ($q) use ($request) {
                $q->where('veterinaire_id', $request->veterinaire_id);
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where('numero_ordonnance', 'like', "%{$request->search}%");
            })
            ->when($request->filled('valides'), function ($q) use ($request) {
                if ($request->boolean('valides')) {
                    $q->where(function ($sub) {
                        $sub->whereNull('date_fin_validite')
                            ->orWhere('date_fin_validite', '>=', now());
                    });
                }
            })
            ->when($request->filled('date_debut'), function ($q) use ($request) {
                $q->whereDate('date_prescription', '>=', $request->date_debut);
            })
            ->when($request->filled('date_fin'), function ($q) use ($request) {
                $q->whereDate('date_prescription', '<=', $request->date_fin);
            })
            ->orderBy('date_prescription', 'desc');

        $ordonnances = $query->paginate($request->input('per_page', 20));

        return OrdonnanceResource::collection($ordonnances);
    }

    /**
     * Détail d'une ordonnance.
     *
     * GET /api/v1/ordonnances/{id}
     */
    public function show(int $id): JsonResponse
    {
        $ordonnance = Ordonnance::with(['animal', 'veterinaire'])
            ->findOrFail($id);

        return response()->json([
            'data' => new OrdonnanceResource($ordonnance),
        ]);
    }

    /**
     * Créer une ordonnance.
     *
     * POST /api/v1/ordonnances
     */
    public function store(StoreOrdonnanceRequest $request): JsonResponse
    {
        $ordonnance = Ordonnance::create($request->validated());
        $ordonnance->load(['animal', 'veterinaire']);

        return response()->json([
            'message' => 'Ordonnance créée avec succès.',
            'data'    => new OrdonnanceResource($ordonnance),
        ], 201);
    }

    /**
     * Modifier une ordonnance.
     *
     * PUT /api/v1/ordonnances/{id}
     */
    public function update(UpdateOrdonnanceRequest $request, int $id): JsonResponse
    {
        $ordonnance = Ordonnance::findOrFail($id);
        $ordonnance->update($request->validated());

        return response()->json([
            'message' => 'Ordonnance modifiée avec succès.',
            'data'    => new OrdonnanceResource($ordonnance->fresh(['animal', 'veterinaire'])),
        ]);
    }

    /**
     * Supprimer une ordonnance (soft delete).
     *
     * DELETE /api/v1/ordonnances/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $ordonnance = Ordonnance::findOrFail($id);
        $ordonnance->delete();

        return response()->json([
            'message' => 'Ordonnance supprimée.',
        ]);
    }
}