<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreFournisseurRequest;
use App\Http\Requests\Api\V1\UpdateFournisseurRequest;
use App\Http\Resources\FournisseurResource;
use App\Models\Fournisseur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des fournisseurs.
 *
 * Toutes les réponses sont en JSON (via FournisseurResource).
 */
class FournisseurController extends Controller
{
    /**
     * Liste paginée des fournisseurs.
     *
     * GET /api/v1/fournisseurs
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Fournisseur::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($sub) use ($request) {
                    $sub->where('nom', 'like', "%{$request->search}%")
                        ->orWhere('raison_sociale', 'like', "%{$request->search}%")
                        ->orWhere('telephone', 'like', "%{$request->search}%")
                        ->orWhere('email', 'like', "%{$request->search}%");
                });
            })
            ->when($request->filled('ville'), function ($q) use ($request) {
                $q->where('ville', $request->ville);
            })
            ->when($request->filled('actif'), function ($q) use ($request) {
                $q->where('actif', $request->boolean('actif'));
            })
            ->orderBy('nom');

        $fournisseurs = $query->paginate($request->input('per_page', 20));

        return FournisseurResource::collection($fournisseurs);
    }

    /**
     * Détail d'un fournisseur.
     *
     * GET /api/v1/fournisseurs/{id}
     */
    public function show(int $id): JsonResponse
    {
        $fournisseur = Fournisseur::findOrFail($id);

        return response()->json([
            'data' => new FournisseurResource($fournisseur),
        ]);
    }

    /**
     * Créer un fournisseur.
     *
     * POST /api/v1/fournisseurs
     */
    public function store(StoreFournisseurRequest $request): JsonResponse
    {
        $fournisseur = Fournisseur::create($request->validated());

        return response()->json([
            'message' => 'Fournisseur créé avec succès.',
            'data'    => new FournisseurResource($fournisseur),
        ], 201);
    }

    /**
     * Modifier un fournisseur.
     *
     * PUT /api/v1/fournisseurs/{id}
     */
    public function update(UpdateFournisseurRequest $request, int $id): JsonResponse
    {
        $fournisseur = Fournisseur::findOrFail($id);
        $fournisseur->update($request->validated());

        return response()->json([
            'message' => 'Fournisseur modifié avec succès.',
            'data'    => new FournisseurResource($fournisseur->fresh()),
        ]);
    }

    /**
     * Supprimer un fournisseur (soft delete).
     *
     * DELETE /api/v1/fournisseurs/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $fournisseur = Fournisseur::findOrFail($id);
        $fournisseur->delete();

        return response()->json([
            'message' => 'Fournisseur supprimé.',
        ]);
    }
}