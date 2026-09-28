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
use Illuminate\Support\Facades\Storage;   // ⚠️ AJOUT : gestion des fichiers

/**
 * ============================================================
 * CONTROLLER API DES MÉDICAMENTS VÉTÉRINAIRES
 * ============================================================
 *
 * Gère :
 *   - Liste paginée + filtres (recherche, catégorie, ordonnance, espèce)
 *   - Détail d'un médicament (stock, alertes, lots)
 *   - Création avec UPLOAD D'IMAGE
 *   - Modification avec remplacement ou suppression d'image
 *   - Soft delete + restauration
 *   - Alertes de stock
 *   - Liste des catégories distinctes
 *
 * SÉCURITÉ DES IMAGES :
 *   - Stockage dans storage/app/public/medicaments/
 *   - Suppression physique de l'ancienne image lors du remplacement
 *   - Suppression physique lors du hard delete (via forceDelete si implémenté)
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
     * Créer un médicament (avec upload d'image).
     *
     * POST /api/v1/medicaments
     * Rôle requis : Administrateur, Pharmacien
     *
     * ⚠️ IMPORTANT : envoi multipart/form-data (FormData côté JS)
     */
    public function store(StoreMedicamentRequest $request): JsonResponse
    {
        $medicament = DB::transaction(function () use ($request) {

            // ─── 1. Récupérer les données validées ───
            $data = $request->validated();

            // ─── 2. Gestion de l'image ───
            if ($request->hasFile('image')) {
                // Stocke dans storage/app/public/medicaments/
                // Retourne le chemin relatif : "medicaments/abc123.jpg"
                $data['image'] = $request->file('image')->store('medicaments', 'public');
            }

            // ─── 3. Créer le médicament AVEC l'image ───
            $medicament = Medicament::create($data);

            // ─── 4. Synchroniser les espèces ───
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
     * Modifier un médicament (avec gestion de l'image).
     *
     * PUT/PATCH /api/v1/medicaments/{id}
     * Rôle requis : Administrateur, Pharmacien
     *
     * Comportements selon les données reçues :
     *   - Fichier "image" présent         → remplace l'ancienne image
     *   - Champ "supprimer_image" = true  → supprime l'image sans en mettre
     *   - Rien des deux                    → conserve l'image actuelle
     */
    public function update(UpdateMedicamentRequest $request, int $id): JsonResponse
    {
        $medicament = Medicament::findOrFail($id);

        DB::transaction(function () use ($request, $medicament) {

            // ─── 1. Récupérer les données validées ───
            $data = $request->validated();

            // ─── 2. Cas 1 : nouvelle image uploadée ───
            if ($request->hasFile('image')) {
                // Supprimer l'ancienne image physique
                $this->supprimerFichierImage($medicament->image);

                // Enregistrer la nouvelle
                $data['image'] = $request->file('image')->store('medicaments', 'public');
            }

            // ─── 3. Cas 2 : suppression explicite demandée ───
            elseif ($request->boolean('supprimer_image')) {
                $this->supprimerFichierImage($medicament->image);
                $data['image'] = null;
            }

            // ─── 4. Appliquer les modifications ───
            $medicament->update($data);

            // ─── 5. Synchroniser les espèces ───
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
     *
     * ⚠️ L'image N'EST PAS supprimée physiquement (soft delete).
     *    Elle sera supprimée si restauration impossible ou hard delete.
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
     * Rôle requis : Administrateur, Pharmacien
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

    // ============================================================
    // HELPERS PRIVÉS
    // ============================================================

    /**
     * Supprime physiquement un fichier image du disque.
     *
     * Vérifie son existence avant suppression pour éviter les erreurs.
     *
     * @param string|null $chemin Chemin relatif (ex: "medicaments/abc.jpg")
     */
    private function supprimerFichierImage(?string $chemin): void
    {
        if (! $chemin) {
            return;
        }

        if (Storage::disk('public')->exists($chemin)) {
            Storage::disk('public')->delete($chemin);
        }
    }
}