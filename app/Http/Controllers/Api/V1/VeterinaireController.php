<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreVeterinaireRequest;
use App\Http\Requests\Api\V1\UpdateVeterinaireRequest;
use App\Http\Resources\VeterinaireResource;
use App\Models\Veterinaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des vétérinaires.
 *
 * Un vétérinaire est un acteur légal externe (prescripteur).
 * Il est lié aux ordonnances et aux vaccinations.
 */
class VeterinaireController extends Controller
{
    /**
     * Liste paginée avec filtres.
     *
     * GET /api/v1/veterinaires
     *
     * Query params :
     *   - search     : nom, prénom, numéro d'ordre
     *   - specialite : filtre par spécialité
     *   - actif      : true/false
     *   - with_stats : inclure nb ordonnances/vaccinations
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Veterinaire::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $s = $request->search;
                $q->where(function ($sub) use ($s) {
                    $sub->where('nom', 'like', "%{$s}%")
                        ->orWhere('prenom', 'like', "%{$s}%")
                        ->orWhere('numero_ordre', 'like', "%{$s}%");
                });
            })
            ->when($request->filled('specialite'), fn ($q) =>
                $q->where('specialite', $request->specialite)
            )
            ->when($request->has('actif'), fn ($q) =>
                $q->where('actif', $request->boolean('actif'))
            )
            ->orderBy('nom')
            ->orderBy('prenom');

        $perPage = min((int) $request->input('per_page', 20), 100);

        return VeterinaireResource::collection($query->paginate($perPage));
    }

    /**
     * Détail d'un vétérinaire.
     *
     * GET /api/v1/veterinaires/{id}
     */
    public function show(int $id): JsonResponse
    {
        $veterinaire = Veterinaire::withCount(['ordonnances', 'vaccinations'])
            ->findOrFail($id);

        return response()->json([
            'data' => new VeterinaireResource($veterinaire),
            'meta' => [
                'nb_ordonnances'  => $veterinaire->ordonnances_count,
                'nb_vaccinations' => $veterinaire->vaccinations_count,
            ],
        ]);
    }

    /**
     * Créer un vétérinaire.
     *
     * POST /api/v1/veterinaires
     * Rôle requis : Administrateur, Pharmacien
     */
    public function store(StoreVeterinaireRequest $request): JsonResponse
    {
        $veterinaire = Veterinaire::create($request->validated());

        return response()->json([
            'message' => 'Vétérinaire créé avec succès.',
            'data'    => new VeterinaireResource($veterinaire),
        ], 201);
    }

    /**
     * Modifier un vétérinaire.
     *
     * PUT/PATCH /api/v1/veterinaires/{id}
     * Rôle requis : Administrateur, Pharmacien
     */
    public function update(UpdateVeterinaireRequest $request, int $id): JsonResponse
    {
        $veterinaire = Veterinaire::findOrFail($id);
        $veterinaire->update($request->validated());

        return response()->json([
            'message' => 'Vétérinaire modifié avec succès.',
            'data'    => new VeterinaireResource($veterinaire->fresh()),
        ]);
    }

    /**
     * Supprimer (soft delete) un vétérinaire.
     *
     * DELETE /api/v1/veterinaires/{id}
     * Rôle requis : Administrateur
     */
    public function destroy(int $id): JsonResponse
    {
        $veterinaire = Veterinaire::findOrFail($id);

        // On n'efface jamais vraiment un vétérinaire s'il a des ordonnances
        if ($veterinaire->ordonnances()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer : ce vétérinaire a émis des ordonnances. Désactivez-le à la place.',
            ], 409);
        }

        $veterinaire->delete();

        return response()->json([
            'message' => 'Vétérinaire supprimé.',
        ]);
    }

    // ============================================================
    // MÉTHODES SPÉCIALES
    // ============================================================

    /**
     * Activer / désactiver un vétérinaire.
     *
     * POST /api/v1/veterinaires/{id}/toggle-actif
     * Rôle requis : Administrateur, Pharmacien
     */
    public function toggleActif(int $id): JsonResponse
    {
        $veterinaire = Veterinaire::findOrFail($id);
        $veterinaire->update(['actif' => ! $veterinaire->actif]);

        return response()->json([
            'message' => $veterinaire->actif
                ? 'Vétérinaire activé.'
                : 'Vétérinaire désactivé.',
            'data'    => new VeterinaireResource($veterinaire),
        ]);
    }

    /**
     * Liste des spécialités distinctes (pour les filtres frontend).
     *
     * GET /api/v1/veterinaires/specialites
     */
    public function specialites(): JsonResponse
    {
        $specialites = Veterinaire::whereNotNull('specialite')
            ->where('specialite', '!=', '')
            ->distinct()
            ->orderBy('specialite')
            ->pluck('specialite')
            ->values();

        return response()->json([
            'data' => $specialites,
        ]);
    }

    /**
     * Restaurer un vétérinaire supprimé (soft delete).
     *
     * POST /api/v1/veterinaires/{id}/restore
     * Rôle requis : Administrateur
     */
    public function restore(int $id): JsonResponse
    {
        $veterinaire = Veterinaire::withTrashed()->findOrFail($id);
        $veterinaire->restore();

        return response()->json([
            'message' => 'Vétérinaire restauré.',
            'data'    => new VeterinaireResource($veterinaire),
        ]);
    }
}