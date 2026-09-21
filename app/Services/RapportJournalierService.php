<?php

namespace App\Services;

use App\Models\LigneVente;
use App\Models\Vente;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Service de génération des rapports journaliers.
 *
 * Agrège les ventes d'une date donnée dans `rapports_journaliers`.
 */
class RapportJournalierService
{
    /**
     * Génère le rapport pour une date donnée.
     */
    public function genererPourDate(string $date): void
    {
        $debut = Carbon::parse($date)->startOfDay();
        $fin   = Carbon::parse($date)->endOfDay();

        // 1. Ventes validées de la journée
        $ventes = Vente::whereBetween('date_heure', [$debut, $fin])
            ->where('statut', 'validee')
            ->get();

        if ($ventes->isEmpty()) {
            // Pas de vente → rapport à zéro
            $this->upsertRapport($date, [
                'total_ca_ht'            => 0,
                'total_ca_tva'           => 0,
                'total_ca_ttc'           => 0,
                'total_marge_brute_ttc'  => 0,
                'nb_tickets'             => 0,
                'nb_clients_uniques'     => 0,
                'panier_moyen'           => 0,
                'total_especes'          => 0,
                'total_carte'            => 0,
                'total_mobile_money'     => 0,
                'total_credit'           => 0,
                'top_medicament_id'      => null,
                'top_medicament_quantite'=> 0,
            ]);
            return;
        }

        $venteIds = $ventes->pluck('id');

        // 2. CA
        $totalHt  = $ventes->sum('montant_total_ht');
        $totalTva = $ventes->sum('montant_total_tva');
        $totalTtc = $ventes->sum('montant_total_ttc');

        // 3. Marge brute
        $margeBrute = LigneVente::whereIn('vente_id', $venteIds)
            ->sum('marge_brute');

        // 4. Paiements par type
        $paiements = DB::table('paiements')
            ->whereIn('vente_id', $venteIds)
            ->groupBy('type')
            ->selectRaw('type, SUM(montant) as total')
            ->pluck('total', 'type');

        // 5. Top médicament du jour
        $top = LigneVente::whereIn('vente_id', $venteIds)
            ->groupBy('medicament_id')
            ->selectRaw('medicament_id, SUM(quantite) as qte')
            ->orderByDesc('qte')
            ->first();

        // 6. Clients uniques
        $nbClientsUniques = $ventes->whereNotNull('proprietaire_id')
            ->pluck('proprietaire_id')
            ->unique()
            ->count();

        // 7. Upsert
        $this->upsertRapport($date, [
            'total_ca_ht'            => $totalHt,
            'total_ca_tva'           => $totalTva,
            'total_ca_ttc'           => $totalTtc,
            'total_marge_brute_ttc'  => $margeBrute,
            'nb_tickets'             => $ventes->count(),
            'nb_clients_uniques'     => $nbClientsUniques,
            'panier_moyen'           => $ventes->count() > 0 ? $totalTtc / $ventes->count() : 0,
            'total_especes'          => $paiements['especes'] ?? 0,
            'total_carte'            => $paiements['carte'] ?? 0,
            'total_mobile_money'     => $paiements['mobile_money'] ?? 0,
            'total_credit'           => $paiements['credit'] ?? 0,
            'top_medicament_id'      => $top?->medicament_id,
            'top_medicament_quantite'=> $top?->qte ?? 0,
        ]);
    }

    /**
     * Génère les rapports pour une plage de dates.
     */
    public function genererPourPlage(string $debut, string $fin): void
    {
        $start = Carbon::parse($debut);
        $end   = Carbon::parse($fin);

        while ($start->lte($end)) {
            $this->genererPourDate($start->toDateString());
            $start->addDay();
        }
    }

    /**
     * Insère ou met à jour le rapport.
     */
    private function upsertRapport(string $date, array $data): void
    {
        $data['date_reference'] = $date;
        $data['calcule_le']     = now();

        DB::table('rapports_journaliers')->updateOrInsert(
            ['date_reference' => $date],
            $data
        );
    }
}