<?php

namespace App\Http\Controllers\Api\V1;

use App\Exports\LotsPerimesExport;
use App\Exports\StockExport;
use App\Exports\VentesExport;
use App\Http\Controllers\Controller;
use App\Models\RapportJournalier;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportController extends Controller
{
    /**
     * Export CSV des ventes.
     * GET /api/v1/exports/ventes?date_debut=...&date_fin=...
     */
    public function ventes(Request $request): BinaryFileResponse
    {
        $export = new VentesExport(
            $request->input('date_debut'),
            $request->input('date_fin')
        );

        $chemin = $export->generer();
        $nom    = 'ventes_' . now()->format('Y-m-d_His') . '.csv';

        return response()->download($chemin, $nom, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Export CSV du stock.
     * GET /api/v1/exports/stock
     */
    public function stock(): BinaryFileResponse
    {
        $export = new StockExport();
        $chemin = $export->generer();
        $nom    = 'stock_' . now()->format('Y-m-d_His') . '.csv';

        return response()->download($chemin, $nom, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Export CSV des lots périmés.
     * GET /api/v1/exports/lots-perimes
     */
    public function lotsPerimes(): BinaryFileResponse
    {
        $export = new LotsPerimesExport();
        $chemin = $export->generer();
        $nom    = 'lots_perimes_' . now()->format('Y-m-d_His') . '.csv';

        return response()->download($chemin, $nom, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ])->deleteFileAfterSend(true);
    }

    /**
     * Export PDF — DÉSACTIVÉ (nécessite barryvdh/laravel-dompdf).
     */
    public function rapportPdf(Request $request)
    {
        return response()->json([
            'message' => 'Export PDF non disponible. Installez barryvdh/laravel-dompdf.',
        ], 501);
    }
}