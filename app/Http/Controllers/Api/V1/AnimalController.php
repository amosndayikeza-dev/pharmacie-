<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreAnimalRequest;
use App\Http\Requests\Api\V1\UpdateAnimalRequest;
use App\Http\Resources\AnimalResource;
use App\Models\Animal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des animaux.
 *
 * Toutes les réponses sont en JSON (via AnimalResource).
 */
class AnimalController extends Controller
{
    /**
     * Liste paginée des animaux.
     *
     * GET /api/v1/animaux
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Animal::query()
            ->with(['proprietaire', 'espece'])
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($sub) use ($request) {
                    $sub->where('nom', 'like', "%{$request->search}%")
                        ->orWhere('numero_identification', 'like', "%{$request->search}%");
                });
            })
            ->when($request->filled('proprietaire_id'), function ($q) use ($request) {
                $q->where('proprietaire_id', $request->proprietaire_id);
            })
            ->when($request->filled('espece_id'), function ($q) use ($request) {
                $q->where('espece_id', $request->espece_id);
            })
            ->when($request->filled('sexe'), function ($q) use ($request) {
                $q->where('sexe', $request->sexe);
            })
            ->when($request->filled('vivant'), function ($q) use ($request) {
                $q->where('vivant', $request->boolean('vivant'));
            })
            ->orderBy('nom');

        $animaux = $query->paginate($request->input('per_page', 20));

        return AnimalResource::collection($animaux);
    }

    /**
     * Détail d'un animal.
     *
     * GET /api/v1/animaux/{id}
     */
    public function show(int $id): JsonResponse
    {
        $animal = Animal::with(['proprietaire', 'espece'])
            ->findOrFail($id);

        return response()->json([
            'data' => new AnimalResource($animal),
        ]);
    }

    /**
     * Créer un animal.
     *
     * POST /api/v1/animaux
     */
    public function store(StoreAnimalRequest $request): JsonResponse
    {
        $animal = Animal::create($request->validated());
        $animal->load(['proprietaire', 'espece']);

        return response()->json([
            'message' => 'Animal créé avec succès.',
            'data'    => new AnimalResource($animal),
        ], 201);
    }

    /**
     * Modifier un animal.
     *
     * PUT /api/v1/animaux/{id}
     */
    public function update(UpdateAnimalRequest $request, int $id): JsonResponse
    {
        $animal = Animal::findOrFail($id);
        $animal->update($request->validated());

        return response()->json([
            'message' => 'Animal modifié avec succès.',
            'data'    => new AnimalResource($animal->fresh(['proprietaire', 'espece'])),
        ]);
    }

    /**
     * Supprimer un animal (soft delete).
     *
     * DELETE /api/v1/animaux/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $animal = Animal::findOrFail($id);
        $animal->delete();

        return response()->json([
            'message' => 'Animal supprimé.',
        ]);
    }
}