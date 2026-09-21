<?php

namespace App\Exports;

use App\Models\Lot;

class StockExport
{
    public function generer(): string
    {
        $chemin = storage_path('app/stock_' . now()->format('Y-m-d_His') . '.csv');
        $handle = fopen($chemin, 'w');

        fwrite($handle, "\xEF\xBB\xBF");

        fputcsv($handle, [
            'Médicament', 'Code CIP', 'N° Lot', 'Fournisseur',
            'Péremption', 'Stock restant', 'Prix achat HT', 'Valeur stock',
        ], ';');

        Lot::with(['medicament', 'fournisseur'])
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
                        $lot->quantite_restante,
                        number_format((float) $lot->prix_achat_ht_unitaire, 2, ',', ''),
                        number_format((float) ($lot->quantite_restante * $lot->prix_achat_ht_unitaire), 2, ',', ''),
                    ], ';');
                }
            });

        fclose($handle);

        return $chemin;
    }
}