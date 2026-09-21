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
 * Un fournisseur livre des lots de médicaments vétérinaires.
 * Il est lié aux tables `lots`, `achats` et `receptions`.
 */
class FournisseurController extends Controller
{
    /**
     * Liste paginée des fournisseurs.
     *
     * GET /api/v1/fournisseurs
     *
     * Query params :
     *   - search : recherche sur nom, raison sociale, email
     *   - ville  : filtre par ville
     *   - actif  : true/false
     *   - per_page : nombre par page (défaut 20)
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Fournisseur::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->search;
                $q->where(function ($sub) use ($search) {
                    $sub->where('nom', 'like', "%{$search}%")
                        ->orWhere('raison_sociale', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('telephone', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('ville'), fn ($q) =>
                $q->where('ville', $request->ville)
            )
            ->when($request->has('actif'), fn ($q) =>
                $q->where('actif', $request->boolean('actif'))
            )
            ->orderBy('nom');

        $perPage = min((int) $request->input('per_page', 20), 100);

        $fournisseurs = $query->paginate($perPage);

        return FournisseurResource::collection($fournisseurs);
    }

    /**
     * Détail d'un fournisseur.
     *
     * GET /api/v1/fournisseurs/{id}
     */
    public function show(int $id): JsonResponse
    {
        $fournisseur = Fournisseur::withCount(['lots', 'achats', 'receptions'])
            ->findOrFail($id);

        return response()->json([
            'data' => new FournisseurResource($fournisseur),
            'meta' => [
                'nb_lots'       => $fournisseur->lots_count,
                'nb_achats'     => $fournisseur->achats_count,
                'nb_receptions' => $fournisseur->receptions_count,
            ],
        ]);
    }

    /**
     * Créer un fournisseur.
     *
     * POST /api/v1/fournisseurs
     * Rôle requis : Administrateur, Pharmacien
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
     * PUT/PATCH /api/v1/fournisseurs/{id}
     * Rôle requis : Administrateur, Pharmacien
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
     * Supprimer (soft delete) un fournisseur.
     *
     * DELETE /api/v1/fournisseurs/{id}
     * Rôle requis : Administrateur
     */
    public function destroy(int $id): JsonResponse
    {
        $fournisseur = Fournisseur::findOrFail($id);

        // On n'efface jamais vraiment un fournisseur s'il a des lots ou achats
        if ($fournisseur->lots()->exists() || $fournisseur->achats()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer : ce fournisseur a des lots ou des achats associés. Désactivez-le à la place.',
            ], 409);
        }

        $fournisseur->delete();

        return response()->json([
            'message' => 'Fournisseur supprimé.',
        ]);
    }

    // ============================================================
    // MÉTHODES SPÉCIALES
    // ============================================================

    /**
     * Activer / désactiver un fournisseur.
     *
     * POST /api/v1/fournisseurs/{id}/toggle-actif
     * Rôle requis : Administrateur, Pharmacien
     */
    public function toggleActif(int $id): JsonResponse
    {
        $fournisseur = Fournisseur::findOrFail($id);
        $fournisseur->update(['actif' => ! $fournisseur->actif]);

        return response()->json([
            'message' => $fournisseur->actif
                ? 'Fournisseur activé.'
                : 'Fournisseur désactivé.',
            'data'    => new FournisseurResource($fournisseur),
        ]);
    }

    /**
     * Liste des villes distinctes (pour le filtre frontend).
     *
     * GET /api/v1/fournisseurs/villes
     */
    public function villes(): JsonResponse
    {
        $villes = Fournisseur::whereNotNull('ville')
            ->where('ville', '!=', '')
            ->distinct()
            ->orderBy('ville')
            ->pluck('ville')
            ->values();

        return response()->json([
            'data' => $villes,
        ]);
    }

    /**
     * Restaurer un fournisseur supprimé (soft delete).
     *
     * POST /api/v1/fournisseurs/{id}/restore
     * Rôle requis : Administrateur
     */
    public function restore(int $id): JsonResponse
    {
        $fournisseur = Fournisseur::withTrashed()->findOrFail($id);
        $fournisseur->restore();

        return response()->json([
            'message' => 'Fournisseur restauré.',
            'data'    => new FournisseurResource($fournisseur),
        ]);
    }
}