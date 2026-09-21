<?php

namespace App\Console\Commands;

use App\Services\RapportJournalierService;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Commande CRON : génère les agrégats dans `rapports_journaliers`.
 *
 * Usage :
 *   php artisan rapports:generer                 → hier (défaut)
 *   php artisan rapports:generer 2026-09-22      → date spécifique
 *   php artisan rapports:generer --range=2026-01-01,2026-01-31
 */
class GenererRapportsJournaliers extends Command
{
    /**
     * ⚠️ "date" est un ARGUMENT (? = optionnel), pas une option.
     * C'est ce qui permet à Artisan::call(..., ['date' => $date]) de fonctionner.
     */
    protected $signature = 'rapports:generer
                            {date? : Date à générer (format YYYY-MM-DD). Par défaut : hier}
                            {--range= : Plage de dates (ex: 2026-01-01,2026-01-31)}';

    protected $description = 'Génère les rapports journaliers (agrégats) dans la table rapports_journaliers';

    public function handle(RapportJournalierService $service): int
    {
        try {
            $date  = $this->argument('date');
            $range = $this->option('range');

            if ($range) {
                // Plage de dates
                [$debut, $fin] = array_map('trim', explode(',', $range));
                $this->info("🔄 Génération de {$debut} à {$fin}...");
                $service->genererPourPlage($debut, $fin);
            } elseif ($date) {
                // Date spécifique
                $this->info("🔄 Génération pour {$date}...");
                $service->genererPourDate($date);
            } else {
                // Par défaut : hier
                $hier = Carbon::yesterday()->toDateString();
                $this->info("🔄 Génération pour hier ({$hier})...");
                $service->genererPourDate($hier);
            }

            $this->newLine();
            $this->info('✅ Rapports générés avec succès.');
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('❌ Erreur : ' . $e->getMessage());
            $this->error($e->getFile() . ':' . $e->getLine());
            return self::FAILURE;
        }
    }
}