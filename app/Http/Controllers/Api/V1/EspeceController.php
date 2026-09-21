<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreEspeceRequest;
use App\Http\Requests\Api\V1\UpdateEspeceRequest;
use App\Http\Resources\EspeceRessource;
use App\Models\Espece;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des espèces animales.
 */
class EspeceController extends Controller
{
    /**
     * Liste paginée des espèces.
     * GET /api/v1/especes
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Espece::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where('nom', 'like', "%{$request->search}%");
            })
            ->when($request->filled('categorie'), function ($q) use ($request) {
                $q->where('categorie', $request->categorie);
            })
            ->when($request->filled('actif'), function ($q) use ($request) {
                $q->where('actif', $request->boolean('actif'));
            })
            ->orderBy('nom');

        $especes = $query->paginate($request->input('per_page', 20));

        return EspeceRessource::collection($especes);
    }

    /**
     * Détail d'une espèce.
     * GET /api/v1/especes/{id}
     */
    public function show(int $id): JsonResponse
    {
        $espece = Espece::with(['animaux', 'medicaments'])->findOrFail($id);

        return response()->json([
            'data' => new EspeceRessource($espece),
        ]);
    }

    /**
     * Créer une espèce.
     * POST /api/v1/especes
     */
    public function store(StoreEspeceRequest $request): JsonResponse
    {
        $espece = Espece::create($request->validated());

        return response()->json([
            'message' => 'Espèce créée avec succès.',
            'data'    => new EspeceRessource($espece),
        ], 201);
    }

    /**
     * Modifier une espèce.
     * PUT /api/v1/especes/{id}
     */
    public function update(UpdateEspeceRequest $request, int $id): JsonResponse
    {
        $espece = Espece::findOrFail($id);
        $espece->update($request->validated());

        return response()->json([
            'message' => 'Espèce modifiée avec succès.',
            'data'    => new EspeceRessource($espece->fresh()),
        ]);
    }

    /**
     * Supprimer une espèce (soft delete).
     * DELETE /api/v1/especes/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $espece = Espece::findOrFail($id);
        $espece->delete();

        return response()->json([
            'message' => 'Espèce supprimée.',
        ]);
    }
}