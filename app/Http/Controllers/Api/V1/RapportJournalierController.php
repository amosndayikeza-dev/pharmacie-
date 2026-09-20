<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\RapportJournalierResource;
use App\Models\RapportJournalier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/**
 * Controller API des rapports.
 *
 * ⚠️ LECTURE SEULE (sauf /generer pour forcer).
 *    Tous les rapports (journalier/hebdo/mensuel/annuel) sont calculés
 *    à partir de la MÊME table via des SUM().
 */
class RapportJournalierController extends Controller
{
    /**
     * Liste paginée des rapports journaliers.
     * GET /api/v1/rapports/journaliers
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = RapportJournalier::query()
            ->when($request->filled('date_debut'), fn ($q) => $q->where('date_reference', '>=', $request->date_debut))
            ->when($request->filled('date_fin'), fn ($q) => $q->where('date_reference', '<=', $request->date_fin))
            ->orderBy('date_reference', 'desc');

        return RapportJournalierResource::collection(
            $query->paginate($request->input('per_page', 30))
        );
    }

    /**
     * Détail d'un rapport par date.
     * GET /api/v1/rapports/journaliers/{date}
     */
    public function show(string $date): JsonResponse
    {
        $rapport = RapportJournalier::with('topMedicament')
            ->where('date_reference', $date)
            ->firstOrFail();

        return response()->json([
            'data' => new RapportJournalierResource($rapport),
        ]);
    }

    /**
     * Force la génération d'un rapport (admin).
     * POST /api/v1/rapports/generer
     */
    public function generer(Request $request): JsonResponse
    {
        $date = $request->input('date', now()->toDateString());

        Artisan::call('rapports:generer', ['date' => $date]);

        $rapport = RapportJournalier::with('topMedicament')
            ->where('date_reference', $date)
            ->firstOrFail();

        return response()->json([
            'message' => "Rapport du {$date} généré avec succès.",
            'data'    => new RapportJournalierResource($rapport),
        ]);
    }

    /**
     * Rapport hebdomadaire (7 derniers jours).
     * GET /api/v1/rapports/hebdo
     */
    public function hebdo(Request $request): JsonResponse
    {
        $debut = $request->input('debut', now()->subDays(6)->toDateString());
        $fin   = $request->input('fin', now()->toDateString());

        return $this->agregerPeriode($debut, $fin, 'hebdomadaire');
    }

    /**
     * Rapport mensuel.
     * GET /api/v1/rapports/mensuel?mois=1&annee=2025
     */
    public function mensuel(Request $request): JsonResponse
    {
        $mois  = (int) $request->input('mois', now()->month);
        $annee = (int) $request->input('annee', now()->year);

        $debut = sprintf('%04d-%02d-01', $annee, $mois);
        $fin   = date('Y-m-t', strtotime($debut));

        return $this->agregerPeriode($debut, $fin, 'mensuel');
    }

    /**
     * Rapport annuel.
     * GET /api/v1/rapports/annuel?annee=2025
     */
    public function annuel(Request $request): JsonResponse
    {
        $annee = (int) $request->input('annee', now()->year);

        $debut = "{$annee}-01-01";
        $fin   = "{$annee}-12-31";

        return $this->agregerPeriode($debut, $fin, 'annuel');
    }

    // ═══════════════════════════════════════════════════════════════
    // MÉTHODE PRIVÉE : agrège une période
    // ═══════════════════════════════════════════════════════════════

    private function agregerPeriode(string $debut, string $fin, string $libelle): JsonResponse
    {
        $stats = RapportJournalier::query()
            ->whereBetween('date_reference', [$debut, $fin])
            ->selectRaw('
                COALESCE(SUM(total_ca_ht), 0)           as ca_ht,
                COALESCE(SUM(total_ca_tva), 0)          as ca_tva,
                COALESCE(SUM(total_ca_ttc), 0)          as ca_ttc,
                COALESCE(SUM(total_marge_brute_ttc), 0) as marge,
                COALESCE(SUM(nb_tickets), 0)            as tickets,
                COALESCE(SUM(nb_clients_uniques), 0)    as clients,
                COALESCE(SUM(total_especes), 0)         as especes,
                COALESCE(SUM(total_carte), 0)           as carte,
                COALESCE(SUM(total_mobile_money), 0)    as mobile,
                COALESCE(SUM(total_credit), 0)          as credit
            ')
            ->first();

        $nbTickets = (int) $stats->tickets;

        return response()->json([
            'periode' => [
                'libelle' => $libelle,
                'debut'   => $debut,
                'fin'     => $fin,
            ],
            'data' => [
                'total_ca_ht'           => (float) $stats->ca_ht,
                'total_ca_tva'          => (float) $stats->ca_tva,
                'total_ca_ttc'          => (float) $stats->ca_ttc,
                'total_marge_brute_ttc' => (float) $stats->marge,
                'nb_tickets'            => $nbTickets,
                'nb_clients_uniques'    => (int) $stats->clients,
                'panier_moyen'          => $nbTickets > 0
                    ? round((float) $stats->ca_ttc / $nbTickets, 2)
                    : 0,
                'total_especes'         => (float) $stats->especes,
                'total_carte'           => (float) $stats->carte,
                'total_mobile_money'    => (float) $stats->mobile,
                'total_credit'          => (float) $stats->credit,
            ],
        ]);
    }
}