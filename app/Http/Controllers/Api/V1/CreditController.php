<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Paiement;
use App\Models\ReglementCredit;
use App\Services\LogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ============================================================
 * CONTROLLER API DES CRÉDITS CLIENTS (CRÉANCES)
 * ============================================================
 *
 * RÈGLES MÉTIER :
 *   - Un crédit est un paiement de type "credit" avec montant > 0
 *   - Un crédit soldé (reste <= 0.01) disparaît des listes
 *   - Tolérance flottante : 0.01 BIF (évite les erreurs d'arrondi)
 *   - Un client "débiteur" est un client avec AU MOINS 1 crédit non soldé
 *
 * ROUTES :
 *   GET  /api/v1/credits                          → Liste des crédits actifs
 *   GET  /api/v1/credits/stats                    → Statistiques globales
 *   GET  /api/v1/credits/client/{clientId}        → Crédits d'un client
 *   POST /api/v1/credits/{paiementId}/regler      → Encaisser un règlement
 */
class CreditController extends Controller
{
    /**
     * Tolérance flottante (BIF) pour considérer un crédit comme soldé.
     *
     * Ex: reste = 0.005 BIF → considéré comme soldé
     *     reste = 0.02 BIF  → encore dû
     */
    private const TOLERANCE = 0.01;

    /**
     * Liste des crédits non soldés (créances actives).
     *
     * GET /api/v1/credits
     */
    public function index(Request $request): JsonResponse
    {
        $credits = Paiement::query()
            ->where('type', 'credit')
            ->where('montant', '>', 0)          // ⚠️ exclut les crédits à 0
            ->with([
                'vente:id,numero_ticket,date_heure,proprietaire_id',
                'vente.proprietaire:id,nom,prenom,raison_sociale,type,telephone',
                'reglements',
            ])
            ->get()
            ->filter(function ($paiement) {
                // ⚠️ Garde uniquement ceux qui ont encore un reste significatif
                return $paiement->resteAPayer() > self::TOLERANCE;
            })
            ->map(function ($paiement) {
                $vente  = $paiement->vente;
                $client = $vente?->proprietaire;

                return [
                    'paiement_id'      => $paiement->id,
                    'vente_id'         => $vente?->id,
                    'numero_ticket'    => $vente?->numero_ticket,
                    'date_vente'       => $vente?->date_heure?->toISOString(),
                    'client_id'        => $client?->id,
                    'client_nom'       => $this->nomClient($client),
                    'client_telephone' => $client?->telephone,
                    'montant_initial'  => (float) $paiement->montant,
                    'montant_regle'    => round((float) $paiement->montantRegle(), 2),
                    'reste_a_payer'    => round((float) $paiement->resteAPayer(), 2),
                ];
            })
            ->sortByDesc('date_vente')
            ->values();

        return response()->json([
            'data'  => $credits,
            'count' => $credits->count(),
            'total' => round($credits->sum('reste_a_payer'), 2),
        ]);
    }

    /**
     * Détail des crédits d'un client donné.
     *
     * GET /api/v1/credits/client/{clientId}
     */
    public function parClient(int $clientId): JsonResponse
    {
        $credits = Paiement::query()
            ->where('type', 'credit')
            ->where('montant', '>', 0)          // ⚠️ exclut les crédits à 0
            ->whereHas('vente', fn ($q) => $q->where('proprietaire_id', $clientId))
            ->with([
                'vente:id,numero_ticket,date_heure,proprietaire_id',
                'vente.proprietaire',
                'reglements.utilisateur:id,nom,prenom',
            ])
            ->get()
            ->map(function ($paiement) {
                $reste = round((float) $paiement->resteAPayer(), 2);

                return [
                    'paiement_id'     => $paiement->id,
                    'numero_ticket'   => $paiement->vente?->numero_ticket,
                    'date_vente'      => $paiement->vente?->date_heure?->toISOString(),
                    'montant_initial' => (float) $paiement->montant,
                    'montant_regle'   => round((float) $paiement->montantRegle(), 2),
                    'reste_a_payer'   => $reste,
                    'solde'           => $reste <= self::TOLERANCE,
                    'reglements'      => $paiement->reglements->map(fn ($r) => [
                        'id'         => $r->id,
                        'montant'    => (float) $r->montant,
                        'mode'       => $r->mode,
                        'date'       => $r->date_heure?->toISOString(),
                        'par'        => $r->utilisateur
                            ? "{$r->utilisateur->prenom} {$r->utilisateur->nom}"
                            : '—',
                    ]),
                ];
            })
            ->sortByDesc('date_vente')
            ->values();

        return response()->json([
            'data'     => $credits,
            'total_du' => round($credits->sum('reste_a_payer'), 2),
        ]);
    }

    /**
     * Encaisse un règlement sur un crédit.
     *
     * POST /api/v1/credits/{paiementId}/regler
     * Body: { "montant": 10000, "mode": "especes", "notes": "..." }
     */
    public function regler(Request $request, int $paiementId): JsonResponse
    {
        $request->validate([
            'montant' => ['required', 'numeric', 'min:1'],
            'mode'    => ['nullable', 'in:especes,carte,mobile_money'],
            'notes'   => ['nullable', 'string', 'max:500'],
        ]);

        return DB::transaction(function () use ($request, $paiementId) {

            $paiement = Paiement::findOrFail($paiementId);

            // ─── Vérifications ───
            if ($paiement->type !== 'credit') {
                return response()->json([
                    'message' => 'Ce paiement n\'est pas un crédit.',
                ], 422);
            }

            if ($paiement->montant <= 0) {
                return response()->json([
                    'message' => 'Ce crédit a un montant nul (aucun règlement possible).',
                ], 422);
            }

            $reste   = round((float) $paiement->resteAPayer(), 2);
            $montant = round((float) $request->montant, 2);

            // ⚠️ Tolérance 0.01 → permet de payer la dette EXACTE
            if ($montant > $reste + self::TOLERANCE) {
                return response()->json([
                    'message' => "Le montant dépasse le reste à payer ("
                               . number_format($reste, 0, ',', ' ')
                               . " BIF).",
                ], 422);
            }

            // ─── Créer le règlement ───
            $reglement = ReglementCredit::create([
                'paiement_id'    => $paiementId,
                'montant'        => $montant,
                'utilisateur_id' => $request->user()->id,
                'mode'           => $request->input('mode', 'especes'),
                'date_heure'     => now(),
                'notes'          => $request->notes,
            ]);

                        // ⚠️ Mettre à jour le statut de la vente si le crédit est totalement soldé
            $vente = $paiement->vente;
            if ($vente) {
                $nouveauReste = round((float) $paiement->fresh()->resteAPayer(), 2);

                if ($nouveauReste <= self::TOLERANCE) {
                    $vente->update(['statut' => 'validee']);
                } else {
                    // Le crédit est partiellement réglé mais pas soldé
                    $vente->update(['statut' => 'partielle']);
                }
            }

            // ─── Log RGPD ───
            LogService::log(
                'reglement_credit',
                'ventes',
                $paiement,
                null,
                [
                    'montant' => $montant,
                    'mode'    => $reglement->mode,
                ]
            );

            // ─── Calculer le nouveau reste ───
            $nouveauReste = round((float) $paiement->fresh()->resteAPayer(), 2);

            return response()->json([
                'message'       => 'Règlement enregistré.',
                'data'          => [
                    'id'      => $reglement->id,
                    'montant' => (float) $reglement->montant,
                    'mode'    => $reglement->mode,
                ],
                'nouveau_reste' => $nouveauReste,
                'solde'         => $nouveauReste <= self::TOLERANCE,
            ], 201);
        });
    }

    /**
     * Statistiques globales des crédits.
     *
     * GET /api/v1/credits/stats
     */
    public function stats(): JsonResponse
    {
        // ─── Total des crédits créés (uniquement ceux > 0) ───
        $totalCredits = (float) Paiement::where('type', 'credit')
            ->where('montant', '>', 0)
            ->sum('montant');

        // ─── Total réglé ───
        $totalRegle = (float) ReglementCredit::sum('montant');

        // ─── Créances actuelles ───
        $creances = round($totalCredits - $totalRegle, 2);
        if ($creances < 0) $creances = 0;   // sécurité

        // ─── Clients débiteurs (avec au moins 1 crédit non soldé) ───
        $clientsDebiteurs = Paiement::where('type', 'credit')
            ->where('montant', '>', 0)
            ->with('vente:id,proprietaire_id')
            ->get()
            ->filter(fn ($p) => $p->resteAPayer() > self::TOLERANCE)
            ->pluck('vente.proprietaire_id')
            ->filter()
            ->unique()
            ->count();

        return response()->json([
            'data' => [
                'total_credits'      => $totalCredits,
                'total_regle'        => $totalRegle,
                'creances_actuelles' => $creances,
                'clients_debiteurs'  => $clientsDebiteurs,
            ],
        ]);
    }

    // ============================================================
    // HELPERS PRIVÉS
    // ============================================================

    /**
     * Retourne le nom d'affichage d'un client (particulier ou structure).
     */
    private function nomClient(?object $client): string
    {
        if (! $client) {
            return 'Client inconnu';
        }

        if ($client->type === 'particulier') {
            return trim("{$client->prenom} {$client->nom}");
        }

        return $client->raison_sociale ?? $client->nom;
    }
}