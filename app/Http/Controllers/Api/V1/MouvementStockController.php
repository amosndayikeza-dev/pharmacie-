<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\MouvementStockResource;
use App\Models\MouvementStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des mouvements de stock.
 *
 * ⚠️ LECTURE SEULE : pas de store, pas de update, pas de destroy.
 *    Les mouvements sont créés automatiquement par :
 *      - ReceptionService (entrées d'achat)
 *      - VenteService (sorties de vente)
 */
class MouvementStockController extends Controller
{
    /**
     * Liste paginée des mouvements de stock.
     *
     * GET /api/v1/mouvements-stock
     *
     * Filtres :
     *   - lot_id
     *   - type (achat, vente, perte, ajustement)
     *   - reference_type + reference_id (mouvements d'une vente/réception)
     *   - utilisateur_id
     *   - date_debut / date_fin
     *   - entrees=true / sorties=true
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = MouvementStock::query()
            ->with(['lot.medicament', 'utilisateur'])
            ->when($request->filled('lot_id'), fn ($q) => $q->where('lot_id', $request->lot_id))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->type))
            ->when($request->filled('utilisateur_id'), fn ($q) => $q->where('utilisateur_id', $request->utilisateur_id))
            ->when($request->filled('reference_type'), fn ($q) => $q->where('reference_type', $request->reference_type))
            ->when($request->filled('reference_id'), fn ($q) => $q->where('reference_id', $request->reference_id))
            ->when($request->filled('date_debut'), fn ($q) => $q->whereDate('date_heure', '>=', $request->date_debut))
            ->when($request->filled('date_fin'), fn ($q) => $q->whereDate('date_heure', '<=', $request->date_fin))
            ->when($request->boolean('entrees'), fn ($q) => $q->where('quantite', '>', 0))
            ->when($request->boolean('sorties'), fn ($q) => $q->where('quantite', '<', 0))
            ->orderBy('date_heure', 'desc');

        return MouvementStockResource::collection(
            $query->paginate($request->input('per_page', 50))
        );
    }

    /**
     * Détail d'un mouvement.
     * GET /api/v1/mouvements-stock/{id}
     */
    public function show(int $id): JsonResponse
    {
        $mouvement = MouvementStock::with(['lot.medicament', 'utilisateur'])
            ->findOrFail($id);

        return response()->json([
            'data' => new MouvementStockResource($mouvement),
        ]);
    }

    /**
     * Historique des mouvements d'un lot donné.
     * GET /api/v1/mouvements-stock/par-lot/{lotId}
     */
    public function parLot(int $lotId): AnonymousResourceCollection
    {
        $mouvements = MouvementStock::query()
            ->with(['lot.medicament', 'utilisateur'])
            ->where('lot_id', $lotId)
            ->orderBy('date_heure', 'asc')
            ->get();

        return MouvementStockResource::collection($mouvements);
    }

    /**
     * Historique des mouvements d'une vente/réception.
     * GET /api/v1/mouvements-stock/par-reference?reference_type=Vente&reference_id=5
     */
    public function parReference(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'reference_type' => ['required', 'string', 'max:50'],
            'reference_id'   => ['required', 'integer', 'min:1'],
        ]);

        $mouvements = MouvementStock::query()
            ->with(['lot.medicament', 'utilisateur'])
            ->where('reference_type', $request->reference_type)
            ->where('reference_id', $request->reference_id)
            ->orderBy('date_heure', 'asc')
            ->get();

        return MouvementStockResource::collection($mouvements);
    }
}