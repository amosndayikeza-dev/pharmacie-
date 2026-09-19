<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreAchatRequest;
use App\Http\Requests\Api\V1\UpdateAchatRequest;
use App\Http\Resources\AchatResource;
use App\Models\Achat;
use App\Models\LigneAchat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Controller API des commandes d'achat fournisseurs.
 *
 * ⚠️ RÈGLES MÉTIER :
 *   - utilisateur_id est récupéré automatiquement (auth()->id())
 *   - statut = 'brouillon' à la création
 *   - Une commande n'est modifiable QUE si statut = 'brouillon'
 *   - Les montants totaux sont calculés automatiquement
 *   - Tout est fait dans une TRANSACTION
 */
class AchatController extends Controller
{
    /**
     * Liste paginée des commandes d'achat.
     *
     * GET /api/v1/achats
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Achat::query()
            ->with(['fournisseur', 'utilisateur', 'lignes'])
            ->when($request->filled('fournisseur_id'), function ($q) use ($request) {
                $q->where('fournisseur_id', $request->fournisseur_id);
            })
            ->when($request->filled('statut'), function ($q) use ($request) {
                $q->where('statut', $request->statut);
            })
            ->when($request->filled('date_debut'), function ($q) use ($request) {
                $q->whereDate('date_commande', '>=', $request->date_debut);
            })
            ->when($request->filled('date_fin'), function ($q) use ($request) {
                $q->whereDate('date_commande', '<=', $request->date_fin);
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where('numero_commande', 'like', "%{$request->search}%");
            })
            ->orderBy('date_commande', 'desc');

        $achats = $query->paginate($request->input('per_page', 20));

        return AchatResource::collection($achats);
    }

    /**
     * Détail d'une commande.
     *
     * GET /api/v1/achats/{id}
     */
    public function show(int $id): JsonResponse
    {
        $achat = Achat::with(['fournisseur', 'utilisateur', 'lignes.medicament'])
            ->findOrFail($id);

        return response()->json([
            'data' => new AchatResource($achat),
        ]);
    }

    /**
     * Créer une commande d'achat.
     *
     * POST /api/v1/achats
     *
     * ⚠️ Transaction : on crée l'achat ET ses lignes en une seule fois.
     *    Si une ligne échoue, TOUT est annulé.
     */
    public function store(StoreAchatRequest $request): JsonResponse
    {
        $data = $request->validated();

        $achat = DB::transaction(function () use ($data, $request) {

            // 1. Calcul des montants totaux à partir des lignes
            $montantHt = 0;
            $montantTva = 0;

            foreach ($data['lignes'] as $ligne) {
                $ligneHt = $ligne['quantite_commandee'] * $ligne['prix_achat_ht_unitaire'];
                $ligneTva = $ligneHt * (($ligne['taux_tva'] ?? 0) / 100);

                $montantHt += $ligneHt;
                $montantTva += $ligneTva;
            }

            $montantTtc = $montantHt + $montantTva;

            // 2. Création de la commande
            $achat = Achat::create([
                'numero_commande'       => $this->genererNumeroCommande(),
                'fournisseur_id'        => $data['fournisseur_id'],
                'utilisateur_id'        => $request->user()->id,  // ← auto
                'date_commande'         => $data['date_commande'],
                'date_livraison_prevue' => $data['date_livraison_prevue'] ?? null,
                'montant_total_ht'      => $montantHt,
                'montant_total_tva'     => $montantTva,
                'montant_total_ttc'     => $montantTtc,
                'statut'                => 'brouillon',  // ← forcé
                'notes'                 => $data['notes'] ?? null,
            ]);

            // 3. Création des lignes
            foreach ($data['lignes'] as $ligne) {
                $ligneHt = $ligne['quantite_commandee'] * $ligne['prix_achat_ht_unitaire'];
                $ligneTva = $ligneHt * (($ligne['taux_tva'] ?? 0) / 100);

                LigneAchat::create([
                    'achat_id'               => $achat->id,
                    'medicament_id'          => $ligne['medicament_id'],
                    'quantite_commandee'     => $ligne['quantite_commandee'],
                    'quantite_recue'         => 0,
                    'prix_achat_ht_unitaire' => $ligne['prix_achat_ht_unitaire'],
                    'taux_tva'               => $ligne['taux_tva'] ?? 0,
                    'montant_ht'             => $ligneHt,
                    'montant_ttc'            => $ligneHt + $ligneTva,
                ]);
            }

            return $achat;
        });

        $achat->load(['fournisseur', 'utilisateur', 'lignes.medicament']);

        return response()->json([
            'message' => 'Commande créée avec succès.',
            'data'    => new AchatResource($achat),
        ], 201);
    }

    /**
     * Modifier une commande d'achat.
     *
     * PUT /api/v1/achats/{id}
     *
     * ⚠️ RÈGLE : modification autorisée UNIQUEMENT si statut = 'brouillon'.
     */
    public function update(UpdateAchatRequest $request, int $id): JsonResponse
    {
        $achat = Achat::findOrFail($id);

        // Vérification du statut
        if ($achat->statut !== 'brouillon') {
            return response()->json([
                'message' => 'Impossible de modifier une commande qui n\'est plus en brouillon.',
            ], 409);
        }

        $data = $request->validated();

        DB::transaction(function () use ($achat, $data) {

            // Mise à jour des champs simples
            if (isset($data['date_livraison_prevue'])) {
                $achat->date_livraison_prevue = $data['date_livraison_prevue'];
            }
            if (isset($data['notes'])) {
                $achat->notes = $data['notes'];
            }

            // Mise à jour des lignes si fournies (remplacement complet)
            if (isset($data['lignes'])) {
                $achat->lignes()->delete();  // on supprime les anciennes lignes

                $montantHt = 0;
                $montantTva = 0;

                foreach ($data['lignes'] as $ligne) {
                    $ligneHt = $ligne['quantite_commandee'] * $ligne['prix_achat_ht_unitaire'];
                    $ligneTva = $ligneHt * (($ligne['taux_tva'] ?? 0) / 100);

                    $montantHt += $ligneHt;
                    $montantTva += $ligneTva;

                    LigneAchat::create([
                        'achat_id'               => $achat->id,
                        'medicament_id'          => $ligne['medicament_id'],
                        'quantite_commandee'     => $ligne['quantite_commandee'],
                        'quantite_recue'         => 0,
                        'prix_achat_ht_unitaire' => $ligne['prix_achat_ht_unitaire'],
                        'taux_tva'               => $ligne['taux_tva'] ?? 0,
                        'montant_ht'             => $ligneHt,
                        'montant_ttc'            => $ligneHt + $ligneTva,
                    ]);
                }

                $achat->montant_total_ht  = $montantHt;
                $achat->montant_total_tva = $montantTva;
                $achat->montant_total_ttc = $montantHt + $montantTva;
            }

            $achat->save();
        });

        $achat->load(['fournisseur', 'utilisateur', 'lignes.medicament']);

        return response()->json([
            'message' => 'Commande modifiée avec succès.',
            'data'    => new AchatResource($achat),
        ]);
    }

    /**
     * Supprimer une commande (soft delete).
     *
     * DELETE /api/v1/achats/{id}
     *
     * ⚠️ RÈGLE : suppression autorisée UNIQUEMENT si statut = 'brouillon'.
     */
    public function destroy(int $id): JsonResponse
    {
        $achat = Achat::findOrFail($id);

        if ($achat->statut !== 'brouillon') {
            return response()->json([
                'message' => 'Impossible de supprimer une commande qui n\'est plus en brouillon.',
            ], 409);
        }

        $achat->delete();

        return response()->json([
            'message' => 'Commande supprimée.',
        ]);
    }

    /**
     * Génère un numéro de commande unique du type : CMD-2025-0001
     */
    private function genererNumeroCommande(): string
    {
        $annee = now()->year;
        $prefixe = "CMD-{$annee}-";

        // Dernier numéro de l'année en cours
        $dernier = Achat::withTrashed()
            ->where('numero_commande', 'like', "{$prefixe}%")
            ->orderBy('numero_commande', 'desc')
            ->first();

        if ($dernier) {
            $numero = (int) substr($dernier->numero_commande, -4) + 1;
        } else {
            $numero = 1;
        }

        return $prefixe . str_pad($numero, 4, '0', STR_PAD_LEFT);
    }
}