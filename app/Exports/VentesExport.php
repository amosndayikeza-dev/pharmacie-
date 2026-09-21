<?php

namespace App\Exports;

use App\Models\Vente;

class VentesExport
{
    public function __construct(
        protected ?string $dateDebut = null,
        protected ?string $dateFin = null
    ) {}

    public function generer(): string
    {
        $chemin = storage_path('app/ventes_' . now()->format('Y-m-d_His') . '.csv');
        $handle = fopen($chemin, 'w');

        // BOM UTF-8 pour Excel
        fwrite($handle, "\xEF\xBB\xBF");

        // En-têtes
        fputcsv($handle, [
            'N° Ticket', 'Date', 'Client', 'Animal',
            'Vendeur', 'Statut', 'Montant HT', 'TVA', 'Montant TTC',
        ], ';');

        // Lignes
        Vente::with(['proprietaire', 'animal', 'utilisateur'])
            ->when($this->dateDebut, fn ($q) => $q->where('date_heure', '>=', $this->dateDebut . ' 00:00:00'))
            ->when($this->dateFin, fn ($q) => $q->where('date_heure', '<=', $this->dateFin . ' 23:59:59'))
            ->orderByDesc('date_heure')
            ->chunk(500, function ($ventes) use ($handle) {
                foreach ($ventes as $v) {
                    fputcsv($handle, [
                        $v->numero_ticket,
                        $v->date_heure?->format('d/m/Y H:i'),
                        $v->proprietaire
                            ? trim(($v->proprietaire->prenom ?? '') . ' ' . ($v->proprietaire->nom ?? ''))
                            : 'Anonyme',
                        $v->animal?->nom ?? '—',
                        $v->utilisateur
                            ? trim(($v->utilisateur->prenom ?? '') . ' ' . ($v->utilisateur->nom ?? ''))
                            : '—',
                        $v->statut,
                        number_format((float) $v->montant_total_ht, 2, ',', ''),
                        number_format((float) $v->montant_total_tva, 2, ',', ''),
                        number_format((float) $v->montant_total_ttc, 2, ',', ''),
                    ], ';');
                }
            });

        fclose($handle);

        return $chemin;
    }
}