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
use Illuminate\Support\Facades\DB;

/**
 * Controller API des médicaments vétérinaires.
 */
class MedicamentController extends Controller
{
    /**
     * Liste paginée avec filtres.
     *
     * GET /api/v1/medicaments
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Medicament::query()
            ->with('especes')
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->search;
                $q->where(function ($sub) use ($search) {
                    $sub->where('nom', 'like', "%{$search}%")
                        ->orWhere('code_cip', 'like', "%{$search}%")
                        ->orWhere('denomination_commune', 'like', "%{$search}%")
                        ->orWhere('code_barre', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('categorie'), fn ($q) =>
                $q->where('categorie', $request->categorie)
            )
            ->when($request->has('sur_ordonnance'), fn ($q) =>
                $q->where('sur_ordonnance', $request->boolean('sur_ordonnance'))
            )
            ->when($request->has('actif'), fn ($q) =>
                $q->where('actif', $request->boolean('actif'))
            )
            ->when($request->filled('espece_id'), fn ($q) =>
                $q->whereHas('especes', fn ($sub) =>
                    $sub->where('especes.id', $request->espece_id)
                )
            )
            ->orderBy('nom');

        $perPage = min((int) $request->input('per_page', 20), 100);

        $medicaments = $query->paginate($perPage);

        return MedicamentResource::collection($medicaments);
    }

    /**
     * Détail d'un médicament.
     *
     * GET /api/v1/medicaments/{id}
     */
    public function show(int $id): JsonResponse
    {
        $medicament = Medicament::with(['especes', 'lots'])
            ->findOrFail($id);

        return response()->json([
            'data' => new MedicamentResource($medicament),
            'meta' => [
                'stock_disponible' => $medicament->stockDisponible(),
                'en_alerte'        => $medicament->estEnAlerte(),
                'nb_lots'          => $medicament->lots->count(),
                'nb_lots_perimes'  => $medicament->lots->filter(fn ($l) => $l->estPerime())->count(),
            ],
        ]);
    }

    /**
     * Créer un médicament.
     *
     * POST /api/v1/medicaments
     * Rôle requis : Administrateur
     */
    public function store(StoreMedicamentRequest $request): JsonResponse
    {
        $medicament = DB::transaction(function () use ($request) {
            $medicament = Medicament::create($request->validated());

            if ($request->has('especes')) {
                $medicament->especes()->sync($request->input('especes', []));
            }

            return $medicament;
        });

        return response()->json([
            'message' => 'Médicament créé avec succès.',
            'data'    => new MedicamentResource($medicament->load('especes')),
        ], 201);
    }

    /**
     * Modifier un médicament.
     *
     * PUT/PATCH /api/v1/medicaments/{id}
     * Rôle requis : Administrateur
     */
    public function update(UpdateMedicamentRequest $request, int $id): JsonResponse
    {
        $medicament = Medicament::findOrFail($id);

        DB::transaction(function () use ($request, $medicament) {
            $medicament->update($request->validated());

            if ($request->has('especes')) {
                $medicament->especes()->sync($request->input('especes', []));
            }
        });

        return response()->json([
            'message' => 'Médicament modifié avec succès.',
            'data'    => new MedicamentResource($medicament->fresh('especes')),
        ]);
    }

    /**
     * Supprimer (soft delete) un médicament.
     *
     * DELETE /api/v1/medicaments/{id}
     * Rôle requis : Administrateur
     */
    public function destroy(int $id): JsonResponse
    {
        $medicament = Medicament::findOrFail($id);

        // Vérifier qu'il n'y a pas de stock actif
        $stockActif = $medicament->lots()
            ->where('quantite_restante', '>', 0)
            ->exists();

        if ($stockActif) {
            return response()->json([
                'message' => 'Impossible de supprimer : ce médicament a encore du stock actif.',
            ], 409);
        }

        $medicament->delete();

        return response()->json([
            'message' => 'Médicament supprimé.',
        ]);
    }

    // ============================================================
    // MÉTHODES SPÉCIALES
    // ============================================================

    /**
     * Liste des catégories distinctes.
     *
     * GET /api/v1/medicaments/categories
     */
    public function categories(): JsonResponse
    {
        $categories = Medicament::whereNotNull('categorie')
            ->where('categorie', '!=', '')
            ->distinct()
            ->orderBy('categorie')
            ->pluck('categorie')
            ->values();

        return response()->json([
            'data' => $categories,
        ]);
    }

    /**
     * Médicaments en alerte de stock.
     *
     * GET /api/v1/medicaments/alertes-stock
     */
    public function alertesStock(): JsonResponse
    {
        $medicaments = Medicament::where('actif', true)
            ->with('especes')
            ->get()
            ->map(fn ($m) => [
                'id'           => $m->id,
                'nom'          => $m->nom,
                'code_cip'     => $m->code_cip,
                'stock_actuel' => $m->stockDisponible(),
                'seuil_alerte' => $m->seuil_alerte,
                'niveau'       => $m->stockDisponible() === 0 ? 'rupture' : 'alerte',
            ])
            ->filter(fn ($m) => $m['stock_actuel'] <= $m['seuil_alerte'])
            ->sortBy('stock_actuel')
            ->values();

        return response()->json([
            'data'  => $medicaments,
            'count' => $medicaments->count(),
        ]);
    }

    /**
     * Activer / désactiver un médicament.
     *
     * POST /api/v1/medicaments/{id}/toggle-actif
     * Rôle requis : Administrateur
     */
    public function toggleActif(int $id): JsonResponse
    {
        $medicament = Medicament::findOrFail($id);
        $medicament->update(['actif' => ! $medicament->actif]);

        return response()->json([
            'message' => $medicament->actif
                ? 'Médicament activé.'
                : 'Médicament désactivé.',
            'data'    => new MedicamentResource($medicament),
        ]);
    }

    /**
     * Restaurer un médicament supprimé (soft delete).
     *
     * POST /api/v1/medicaments/{id}/restore
     * Rôle requis : Administrateur
     */
    public function restore(int $id): JsonResponse
    {
        $medicament = Medicament::withTrashed()->findOrFail($id);
        $medicament->restore();

        return response()->json([
            'message' => 'Médicament restauré.',
            'data'    => new MedicamentResource($medicament),
        ]);
    }
}