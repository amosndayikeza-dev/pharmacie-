<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreVenteRequest;
use App\Http\Resources\VenteResource;
use App\Models\Vente;
use App\Services\VenteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des ventes.
 *
 * ⚠️ INSERT-ONLY : pas de update, pas de destroy.
 *    Pour corriger une vente → créer un AVOIR.
 */
class VenteController extends Controller
{
    public function __construct(
        private VenteService $service
    ) {}

    /**
     * Liste paginée des ventes.
     * GET /api/v1/ventes
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Vente::query()
            ->with(['proprietaire','animal','utilisateur','ordonnance','paiements.reglements',])
            ->when($request->filled('proprietaire_id'), fn ($q) => $q->where('proprietaire_id', $request->proprietaire_id))
            ->when($request->filled('utilisateur_id'), fn ($q) => $q->where('utilisateur_id', $request->utilisateur_id))
            ->when($request->filled('animal_id'), fn ($q) => $q->where('animal_id', $request->animal_id))
            ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->statut))
            ->when($request->filled('date_debut'), fn ($q) => $q->whereDate('date_heure', '>=', $request->date_debut))
            ->when($request->filled('date_fin'), fn ($q) => $q->whereDate('date_heure', '<=', $request->date_fin))
            ->when($request->filled('search'), fn ($q) => $q->where('numero_ticket', 'like', "%{$request->search}%"))
            ->orderBy('date_heure', 'desc');

        return VenteResource::collection(
            $query->paginate($request->input('per_page', 20))
        );
    }

    /**
     * Détail d'une vente.
     * GET /api/v1/ventes/{id}
     */
    public function show(int $id): JsonResponse
    {
        $vente = Vente::with([
            'proprietaire', 'animal', 'utilisateur',
            'ordonnance', 'lignes.medicament', 'lignes.lot', 'paiements','paiements.reglements',
        ])->findOrFail($id);

        return response()->json([
            'data' => new VenteResource($vente),
        ]);
    }

    /**
     * Créer une vente.
     * POST /api/v1/ventes
     *
     * 🎯 Applique le FEFO et crée les mouvements de stock.
     */
    public function store(StoreVenteRequest $request): JsonResponse
    {
        $vente = $this->service->enregistrer(
            $request->validated(),
            $request->user()->id
        );

        $vente->load([
            'proprietaire', 'animal', 'utilisateur',
            'ordonnance', 'lignes.medicament', 'lignes.lot',
        ]);

        return response()->json([
            'message' => 'Vente enregistrée avec succès.',
            'data'    => new VenteResource($vente),
        ], 201);
    }

    // ═══════════════════════════════════════════════════════════════
    // ⚠️ PAS DE update() NI destroy()
    //
    // Une vente est INSERT-ONLY (CDC) :
    //   - On ne modifie JAMAIS une vente
    //   - On ne supprime JAMAIS une vente
    //   - Pour corriger → créer un AVOIR (endpoint dédié plus tard)
    // ═══════════════════════════════════════════════════════════════
}