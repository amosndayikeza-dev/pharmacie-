<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreLotRequest;
use App\Http\Resources\LotResource;
use App\Models\Lot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des lots.
 *
 * ⚠️ PRINCIPE "INSERT ONLY" (CDC) :
 *   - Un lot est CRÉÉ à la réception d'une commande
 *   - Un lot n'est JAMAIS modifié (pas d'update)
 *   - Un lot n'est JAMAIS supprimé (pas de destroy)
 *   - Les corrections passent par des mouvements de stock tracés
 *
 * Cette approche garantit un AUDIT TRAIL complet : en pharmacie,
 * on doit pouvoir prouver l'historique exact de chaque lot.
 */
class LotController extends Controller
{
    /**
     * Liste paginée des lots.
     *
     * GET /api/v1/lots
     *
     * Filtres disponibles :
     *   - medicament_id      : lots d'un médicament
     *   - fournisseur_id     : lots d'un fournisseur
     *   - numero_lot         : recherche partielle
     *   - disponible=true    : lots vendables (non périmés, stock > 0)
     *   - expirant_dans=N    : lots qui expirent dans N jours (alertes J-30 / J-7)
     *   - perimes=true       : lots déjà périmés
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Lot::query()
            ->with(['medicament', 'fournisseur'])
            ->when($request->filled('medicament_id'), function ($q) use ($request) {
                $q->where('medicament_id', $request->medicament_id);
            })
            ->when($request->filled('fournisseur_id'), function ($q) use ($request) {
                $q->where('fournisseur_id', $request->fournisseur_id);
            })
            ->when($request->filled('numero_lot'), function ($q) use ($request) {
                $q->where('numero_lot', 'like', "%{$request->numero_lot}%");
            })
            ->when($request->filled('disponible'), function ($q) use ($request) {
                if ($request->boolean('disponible')) {
                    $q->where('quantite_restante', '>', 0)
                      ->where('date_peremption', '>=', now());
                }
            })
            ->when($request->filled('expirant_dans'), function ($q) use ($request) {
                $q->expirantDans((int) $request->expirant_dans);
            })
            ->when($request->filled('perimes'), function ($q) use ($request) {
                if ($request->boolean('perimes')) {
                    $q->perimes();
                }
            })
            ->orderBy('date_peremption', 'asc');

        $lots = $query->paginate($request->input('per_page', 20));

        return LotResource::collection($lots);
    }

    /**
     * Détail d'un lot.
     *
     * GET /api/v1/lots/{id}
     */
    public function show(int $id): JsonResponse
    {
        $lot = Lot::with(['medicament', 'fournisseur'])
            ->findOrFail($id);

        return response()->json([
            'data' => new LotResource($lot),
        ]);
    }

    /**
     * Créer un lot (à la réception d'une commande).
     *
     * POST /api/v1/lots
     *
     * ⚠️ La quantite_restante est automatiquement initialisée à
     *    quantite_initiale. Elle ne sera décrémentée que par les ventes.
     */
    public function store(StoreLotRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Initialisation automatique de la quantité restante
        $data['quantite_restante'] = $data['quantite_initiale'];

        $lot = Lot::create($data);
        $lot->load(['medicament', 'fournisseur']);

        return response()->json([
            'message' => 'Lot créé avec succès.',
            'data'    => new LotResource($lot),
        ], 201);
    }

    // ═══════════════════════════════════════════════════════════════
    // ⚠️ PAS DE update() NI destroy()
    //
    // Principe "insert only" du CDC :
    //   - Un lot ne se modifie pas, il se "corrige" via un mouvement
    //     de stock tracé (type = ajustement)
    //   - Un lot ne se supprime pas, il est conservé pour l'audit
    //
    // Les endpoints de correction seront ajoutés au Niveau 3
    // (module Ventes & Mouvements de stock).
    // ═══════════════════════════════════════════════════════════════
}