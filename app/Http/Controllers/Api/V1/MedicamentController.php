<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreMedicamentRequest;
use App\Http\Requests\Api\V1\UpdateMedicamentRequest;
use App\Http\Resources\MedicamentResource;
use App\Models\Medicament;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des médicaments.
 *
 * Toutes les réponses sont en JSON (via MedicamentResource).
 */
class MedicamentController extends Controller
{
    /**
     * Liste paginée des médicaments.
     *
     * GET /api/v1/medicaments
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Medicament::query()
            ->with('especes')
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($sub) use ($request) {
                    $sub->where('nom', 'like', "%{$request->search}%")
                        ->orWhere('code_cip', 'like', "%{$request->search}%")
                        ->orWhere('denomination_commune', 'like', "%{$request->search}%");
                });
            })
            ->when($request->filled('categorie'), fn ($q) => $q->where('categorie', $request->categorie))
            ->when($request->filled('actif'), fn ($q) => $q->where('actif', $request->boolean('actif')))
            ->orderBy('nom');

        $medicaments = $query->paginate($request->input('per_page', 20));

        return MedicamentResource::collection($medicaments);
    }

    /**
     * Détail d'un médicament.
     *
     * GET /api/v1/medicaments/{id}
     */
    public function show(int $id): JsonResponse
    {
        $medicament = Medicament::with(['especes', 'lots'])->findOrFail($id);

        return response()->json([
            'data' => new MedicamentResource($medicament),
            'stock_disponible' => $medicament->stockDisponible(),
        ]);
    }

    /**
     * Créer un médicament.
     *
     * POST /api/v1/medicaments
     */
    public function store(StoreMedicamentRequest $request): JsonResponse
    {
        $medicament = Medicament::create($request->validated());

        // Attacher les espèces si fournies
        if ($request->has('especes')) {
            $medicament->especes()->sync($request->especes);
        }

        return response()->json([
            'message' => 'Médicament créé avec succès.',
            'data'    => new MedicamentResource($medicament->load('especes')),
        ], 201);
    }

    /**
     * Modifier un médicament.
     *
     * PUT /api/v1/medicaments/{id}
     */
    public function update(UpdateMedicamentRequest $request, int $id): JsonResponse
    {
        $medicament = Medicament::findOrFail($id);
        $medicament->update($request->validated());

        if ($request->has('especes')) {
            $medicament->especes()->sync($request->especes);
        }

        return response()->json([
            'message' => 'Médicament modifié avec succès.',
            'data'    => new MedicamentResource($medicament->fresh('especes')),
        ]);
    }

    /**
     * Supprimer (soft delete) un médicament.
     *
     * DELETE /api/v1/medicaments/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $medicament = Medicament::findOrFail($id);
        $medicament->delete();

        return response()->json([
            'message' => 'Médicament supprimé.',
        ]);
    }
}