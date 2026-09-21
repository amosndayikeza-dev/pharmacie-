<?php

namespace App\Exports;

use App\Models\Lot;

class LotsPerimesExport
{
    public function generer(): string
    {
        $chemin = storage_path('app/lots_perimes_' . now()->format('Y-m-d_His') . '.csv');
        $handle = fopen($chemin, 'w');

        fwrite($handle, "\xEF\xBB\xBF");

        fputcsv($handle, [
            'Médicament', 'Code CIP', 'N° Lot', 'Fournisseur',
            'Péremption', 'Jours de retard', 'Quantité restante', 'Valeur perdue',
        ], ';');

        Lot::with(['medicament', 'fournisseur'])
            ->where('date_peremption', '<', now())
            ->where('quantite_restante', '>', 0)
            ->orderBy('date_peremption')
            ->chunk(500, function ($lots) use ($handle) {
                foreach ($lots as $lot) {
                    fputcsv($handle, [
                        $lot->medicament?->nom ?? '—',
                        $lot->medicament?->code_cip ?? '—',
                        $lot->numero_lot,
                        $lot->fournisseur?->nom ?? '—',
                        $lot->date_peremption?->format('d/m/Y'),
                        (int) $lot->date_peremption?->diffInDays(now()),
                        $lot->quantite_restante,
                        number_format((float) ($lot->quantite_restante * $lot->prix_achat_ht_unitaire), 2, ',', ''),
                    ], ';');
                }
            });

        fclose($handle);

        return $chemin;
    }
}