<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreProprietaireRequest;
use App\Http\Requests\Api\V1\UpdateProprietaireRequest;
use App\Http\Resources\ProprietaireResource;
use App\Models\Proprietaire;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des propriétaires.
 *
 * Toutes les réponses sont en JSON (via ProprietaireResource).
 */
class ProprietaireController extends Controller
{
    /**
     * Liste paginée des propriétaires.
     *
     * GET /api/v1/proprietaires
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Proprietaire::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where(function ($sub) use ($request) {
                    $sub->where('nom', 'like', "%{$request->search}%")
                        ->orWhere('prenom', 'like', "%{$request->search}%")
                        ->orWhere('raison_sociale', 'like', "%{$request->search}%")
                        ->orWhere('telephone', 'like', "%{$request->search}%")
                        ->orWhere('email', 'like', "%{$request->search}%");
                });
            })
            ->when($request->filled('type'), function ($q) use ($request) {
                $q->where('type', $request->type);
            })
            ->when($request->filled('ville'), function ($q) use ($request) {
                $q->where('ville', $request->ville);
            })
            ->orderBy('nom')
            ->orderBy('prenom');

        $proprietaires = $query->paginate($request->input('per_page', 20));

        return ProprietaireResource::collection($proprietaires);
    }

    /**
     * Détail d'un propriétaire.
     *
     * GET /api/v1/proprietaires/{id}
     */
    public function show(int $id): JsonResponse
    {
        $proprietaire = Proprietaire::findOrFail($id);

        return response()->json([
            'data' => new ProprietaireResource($proprietaire),
        ]);
    }

    /**
     * Créer un propriétaire.
     *
     * POST /api/v1/proprietaires
     */
    public function store(StoreProprietaireRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Si le consentement RGPD est donné mais pas de date, on la met à maintenant
        if (($data['consentement_rgpd'] ?? false) && empty($data['date_consentement'])) {
            $data['date_consentement'] = now();
        }

        $proprietaire = Proprietaire::create($data);

        return response()->json([
            'message' => 'Propriétaire créé avec succès.',
            'data'    => new ProprietaireResource($proprietaire),
        ], 201);
    }

    /**
     * Modifier un propriétaire.
     *
     * PUT /api/v1/proprietaires/{id}
     */
    public function update(UpdateProprietaireRequest $request, int $id): JsonResponse
    {
        $proprietaire = Proprietaire::findOrFail($id);

        $data = $request->validated();

        // Si le consentement RGPD passe à true et pas de date, on la met à maintenant
        if (isset($data['consentement_rgpd']) 
            && $data['consentement_rgpd'] 
            && empty($proprietaire->date_consentement)
            && empty($data['date_consentement'])) {
            $data['date_consentement'] = now();
        }

        $proprietaire->update($data);

        return response()->json([
            'message' => 'Propriétaire modifié avec succès.',
            'data'    => new ProprietaireResource($proprietaire->fresh()),
        ]);
    }

    /**
     * Supprimer un propriétaire (soft delete).
     *
     * DELETE /api/v1/proprietaires/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $proprietaire = Proprietaire::findOrFail($id);
        $proprietaire->delete();

        return response()->json([
            'message' => 'Propriétaire supprimé.',
        ]);
    }
}