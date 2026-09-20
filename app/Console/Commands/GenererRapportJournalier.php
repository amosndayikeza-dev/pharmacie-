<?php

namespace App\Console\Commands;

use App\Models\LigneVente;
use App\Models\Paiement;
use App\Models\RapportJournalier;
use App\Models\Vente;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Commande : génère (ou met à jour) le rapport journalier d'une date.
 *
 * Usage :
 *   php artisan rapports:generer              → rapport d'aujourd'hui
 *   php artisan rapports:generer 2025-01-15   → rapport du 15/01/2025
 *
 * ⚠️ IDEMPOTENTE : on peut la relancer plusieurs fois sans doubler les données.
 */
class GenererRapportJournalier extends Command
{
    protected $signature   = 'rapports:generer {date?}';
    protected $description = 'Génère le rapport journalier des ventes (idempotent)';

    public function handle(): int
    {
        $date = $this->argument('date')
            ? \Carbon\Carbon::parse($this->argument('date'))->toDateString()
            : now()->toDateString();

        $this->info("📊 Génération du rapport pour le {$date}...");

        // 1. CA : HT / TVA / TTC
        $caStats = Vente::query()
            ->whereDate('date_heure', $date)
            ->where('statut', 'validee')
            ->selectRaw('
                COALESCE(SUM(montant_total_ht), 0)  as ht,
                COALESCE(SUM(montant_total_tva), 0) as tva,
                COALESCE(SUM(montant_total_ttc), 0) as ttc
            ')
            ->first();

        $totalCaHt  = (float) $caStats->ht;
        $totalCaTva = (float) $caStats->tva;
        $totalCaTtc = (float) $caStats->ttc;

        // 2. Marge brute
        $totalMarge = (float) LigneVente::query()
            ->whereHas('vente', function ($q) use ($date) {
                $q->whereDate('date_heure', $date)
                  ->where('statut', 'validee');
            })
            ->sum('marge_brute');

        // 3. Nb tickets + clients uniques
        $nbTickets = Vente::query()
            ->whereDate('date_heure', $date)
            ->where('statut', 'validee')
            ->count();

        $nbClients = Vente::query()
            ->whereDate('date_heure', $date)
            ->where('statut', 'validee')
            ->whereNotNull('proprietaire_id')
            ->distinct('proprietaire_id')
            ->count('proprietaire_id');

        // 4. Panier moyen
        $panierMoyen = $nbTickets > 0 ? round($totalCaTtc / $nbTickets, 2) : 0;

        // 5. Top médicament
        $topMedicament = LigneVente::query()
            ->whereHas('vente', function ($q) use ($date) {
                $q->whereDate('date_heure', $date)
                  ->where('statut', 'validee');
            })
            ->select('medicament_id', DB::raw('SUM(quantite) as total_vendu'))
            ->groupBy('medicament_id')
            ->orderByDesc('total_vendu')
            ->first();

        // 6. Répartition par mode de paiement
        $paiements = Paiement::query()
            ->whereHas('vente', function ($q) use ($date) {
                $q->whereDate('date_heure', $date)
                  ->where('statut', 'validee');
            })
            ->select('type', DB::raw('SUM(montant) as total'))
            ->groupBy('type')
            ->pluck('total', 'type')
            ->toArray();

        $totalEspeces     = (float) ($paiements['especes']      ?? 0);
        $totalCarte       = (float) ($paiements['carte']        ?? 0);
        $totalMobileMoney = (float) ($paiements['mobile_money'] ?? 0);
        $totalCredit      = (float) ($paiements['credit']       ?? 0);

        // 7. Répartition par espèce animale (JSON)
        $repartitionEspece = LigneVente::query()
            ->join('ventes', 'ventes.id', '=', 'ligne_ventes.vente_id')
            ->join('animaux', 'animaux.id', '=', 'ventes.animal_id')
            ->join('especes', 'especes.id', '=', 'animaux.espece_id')
            ->whereDate('ventes.date_heure', $date)
            ->where('ventes.statut', 'validee')
            ->select(
                'especes.nom as espece',
                DB::raw('SUM(ligne_ventes.montant_ttc) as ca_ttc'),
                DB::raw('COUNT(DISTINCT ventes.id) as nb_ventes')
            )
            ->groupBy('especes.nom')
            ->get()
            ->mapWithKeys(function ($row) {
                return [
                    $row->espece => [
                        'ca_ttc'    => round((float) $row->ca_ttc, 2),
                        'nb_ventes' => (int) $row->nb_ventes,
                    ],
                ];
            })
            ->toArray();

        // 8. Créer ou mettre à jour le rapport (idempotent)
        RapportJournalier::updateOrCreate(
            ['date_reference' => $date],
            [
                'total_ca_ht'             => $totalCaHt,
                'total_ca_tva'            => $totalCaTva,
                'total_ca_ttc'            => $totalCaTtc,
                'total_marge_brute_ttc'   => $totalMarge,
                'nb_tickets'              => $nbTickets,
                'nb_clients_uniques'      => $nbClients,
                'panier_moyen'            => $panierMoyen,
                'top_medicament_id'       => $topMedicament?->medicament_id,
                'top_medicament_quantite' => (int) ($topMedicament?->total_vendu ?? 0),
                'total_especes'           => $totalEspeces,
                'total_carte'             => $totalCarte,
                'total_mobile_money'      => $totalMobileMoney,
                'total_credit'            => $totalCredit,
                'repartition_par_espece'  => $repartitionEspece,
                'calcule_le'              => now(),
            ]
        );

        // 9. Affichage
        $this->newLine();
        $this->info('✅ Rapport généré avec succès.');
        $this->newLine();

        $this->table(
            ['Indicateur', 'Valeur'],
            [
                ['CA HT',              number_format($totalCaHt, 2) . ' FBu'],
                ['CA TVA',             number_format($totalCaTva, 2) . ' FBu'],
                ['CA TTC',             number_format($totalCaTtc, 2) . ' FBu'],
                ['Marge brute TTC',    number_format($totalMarge, 2) . ' FBu'],
                ['Nb tickets',         $nbTickets],
                ['Clients uniques',    $nbClients],
                ['Panier moyen',       number_format($panierMoyen, 2) . ' FBu'],
                ['Top médicament ID',  $topMedicament?->medicament_id ?? 'N/A'],
                ['Top médicament qty', (int) ($topMedicament?->total_vendu ?? 0)],
                ['─ Paiements ─',      ''],
                ['  Espèces',          number_format($totalEspeces, 2) . ' FBu'],
                ['  Carte',            number_format($totalCarte, 2) . ' FBu'],
                ['  Mobile Money',     number_format($totalMobileMoney, 2) . ' FBu'],
                ['  Crédit',           number_format($totalCredit, 2) . ' FBu'],
            ]
        );

        if (! empty($repartitionEspece)) {
            $this->newLine();
            $this->info('🐾 Répartition par espèce :');
            $this->table(
                ['Espèce', 'CA TTC', 'Nb ventes'],
                collect($repartitionEspece)->map(function ($data, $espece) {
                    return [
                        $espece,
                        number_format($data['ca_ttc'], 2) . ' FBu',
                        $data['nb_ventes'],
                    ];
                })->values()->toArray()
            );
        }

        return self::SUCCESS;
    }
}