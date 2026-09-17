<?php

namespace App\Services;

use App\Models\Animal;
use App\Models\Lot;
use App\Models\Medicament;
use App\Models\Vente;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Service Dashboard — Calcule toutes les statistiques du tableau de bord.
 *
 * Centralise la logique pour la réutiliser côté Web et côté API.
 */
class DashboardService
{
    /**
     * Statistiques globales (cartes du haut).
     */
    public function getStats(): array
    {
        $aujourdhui = Carbon::today();
        $debutMois  = Carbon::now()->startOfMonth();

        // CA du jour
        $ventesJour = Vente::whereDate('date_heure', $aujourdhui)
            ->where('statut', 'validee')
            ->selectRaw('COUNT(*) as nb_tickets, COALESCE(SUM(montant_total_ttc), 0) as total_ttc')
            ->first();

        // CA du mois
        $caMois = Vente::where('date_heure', '>=', $debutMois)
            ->where('statut', 'validee')
            ->sum('montant_total_ttc');

        // Nombre d'animaux vivants
        $nbAnimaux = Animal::where('vivant', true)->count();

        // Nombre de médicaments actifs
        $nbMedicaments = Medicament::where('actif', true)->count();

        // Nombre de lots périmés encore en stock
        $nbLotsPerimes = Lot::perimes()->count();

        // Nombre de lots expirant bientôt
        $nbLotsAlerte = Lot::expirantDans(30)->count();

        return [
            'ca_jour'           => (float) ($ventesJour->total_ttc ?? 0),
            'tickets_jour'      => (int)   ($ventesJour->nb_tickets ?? 0),
            'ca_mois'           => (float) $caMois,
            'nb_animaux'        => $nbAnimaux,
            'nb_medicaments'    => $nbMedicaments,
            'nb_lots_perimes'   => $nbLotsPerimes,
            'nb_lots_alerte'    => $nbLotsAlerte,
        ];
    }

    /**
     * Médicaments sous le seuil d'alerte.
     */
    public function getAlertesStock(int $limit = 5): array
    {
        // Médicaments dont le stock total <= seuil d'alerte
        $medicaments = Medicament::where('actif', true)
            ->get()
            ->map(function ($medicament) {
                return [
                    'id'             => $medicament->id,
                    'nom'            => $medicament->nom,
                    'code_cip'       => $medicament->code_cip,
                    'stock_actuel'   => $medicament->stockDisponible(),
                    'seuil_alerte'   => $medicament->seuil_alerte,
                ];
            })
            ->filter(fn ($m) => $m['stock_actuel'] <= $m['seuil_alerte'])
            ->sortBy('stock_actuel')
            ->take($limit)
            ->values()
            ->toArray();

        return $medicaments;
    }

    /**
     * Lots expirant bientôt (J-30) ou déjà périmés.
     */
    public function getAlertesPeremption(): array
    {
        // Lots périmés (encore en stock)
        $perimes = Lot::perimes()
            ->with('medicament:id,nom,code_cip')
            ->orderBy('date_peremption')
            ->limit(10)
            ->get()
            ->map(fn ($lot) => [
                'id'               => $lot->id,
                'numero_lot'       => $lot->numero_lot,
                'medicament'       => $lot->medicament?->nom,
                'code_cip'         => $lot->medicament?->code_cip,
                'date_peremption'  => $lot->date_peremption?->toDateString(),
                'jours_restants'   => $lot->joursAvantPeremption(),
                'quantite'         => $lot->quantite_restante,
                'niveau'           => 'perime',
            ])
            ->toArray();

        // Lots expirant dans 7 jours
        $j7 = Lot::expirantDans(7)
            ->with('medicament:id,nom,code_cip')
            ->orderBy('date_peremption')
            ->limit(10)
            ->get()
            ->map(fn ($lot) => [
                'id'               => $lot->id,
                'numero_lot'       => $lot->numero_lot,
                'medicament'       => $lot->medicament?->nom,
                'code_cip'         => $lot->medicament?->code_cip,
                'date_peremption'  => $lot->date_peremption?->toDateString(),
                'jours_restants'   => $lot->joursAvantPeremption(),
                'quantite'         => $lot->quantite_restante,
                'niveau'           => 'critique',
            ])
            ->toArray();

        // Lots expirant entre 8 et 30 jours
        $j30 = Lot::expirantDans(30)
            ->where('date_peremption', '>', now()->addDays(7))
            ->with('medicament:id,nom,code_cip')
            ->orderBy('date_peremption')
            ->limit(10)
            ->get()
            ->map(fn ($lot) => [
                'id'               => $lot->id,
                'numero_lot'       => $lot->numero_lot,
                'medicament'       => $lot->medicament?->nom,
                'code_cip'         => $lot->medicament?->code_cip,
                'date_peremption'  => $lot->date_peremption?->toDateString(),
                'jours_restants'   => $lot->joursAvantPeremption(),
                'quantite'         => $lot->quantite_restante,
                'niveau'           => 'attention',
            ])
            ->toArray();

        return [
            'perimes'   => $perimes,
            'critiques' => $j7,
            'attention' => $j30,
        ];
    }

    /**
     * 5 dernières ventes.
     */
    public function getVentesRecentes(int $limit = 5): array
    {
        return Vente::with([
                'proprietaire:id,nom,prenom,raison_sociale,type',
                'animal:id,nom',
                'utilisateur:id,nom,prenom',
            ])
            ->where('statut', 'validee')
            ->orderByDesc('date_heure')
            ->limit($limit)
            ->get()
            ->map(fn ($vente) => [
                'id'              => $vente->id,
                'numero_ticket'   => $vente->numero_ticket,
                'date_heure'      => $vente->date_heure?->toISOString(),
                'montant_ttc'     => (float) $vente->montant_total_ttc,
                'proprietaire'    => $vente->proprietaire?->nomComplet() ?? 'Client anonyme',
                'animal'          => $vente->animal?->nom,
                'vendeur'         => $vente->utilisateur
                    ? "{$vente->utilisateur->prenom} {$vente->utilisateur->nom}"
                    : '—',
            ])
            ->toArray();
    }

    /**
     * Top 5 médicaments vendus ce mois.
     */
    public function getTopMedicaments(int $limit = 5): array
    {
        $debutMois = Carbon::now()->startOfMonth();

        return DB::table('ligne_ventes')
            ->join('ventes', 'ventes.id', '=', 'ligne_ventes.vente_id')
            ->join('medicaments', 'medicaments.id', '=', 'ligne_ventes.medicament_id')
            ->where('ventes.date_heure', '>=', $debutMois)
            ->where('ventes.statut', 'validee')
            ->groupBy('ligne_ventes.medicament_id', 'medicaments.nom', 'medicaments.code_cip')
            ->selectRaw('
                ligne_ventes.medicament_id as id,
                medicaments.nom,
                medicaments.code_cip,
                SUM(ligne_ventes.quantite) as quantite_vendue,
                SUM(ligne_ventes.montant_ttc) as ca_total
            ')
            ->orderByDesc('quantite_vendue')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'id'              => $row->id,
                'nom'             => $row->nom,
                'code_cip'        => $row->code_cip,
                'quantite_vendue' => (int) $row->quantite_vendue,
                'ca_total'        => (float) $row->ca_total,
            ])
            ->toArray();
    }

    /**
     * CA des 7 derniers jours (pour graphique).
     */
    public function getVentesSemaine(): array
    {
        $data = [];

        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);

            $ca = Vente::whereDate('date_heure', $date)
                ->where('statut', 'validee')
                ->sum('montant_total_ttc');

            $data[] = [
                'date'  => $date->toDateString(),
                'label' => $date->locale('fr')->isoFormat('ddd D'),
                'ca'    => (float) $ca,
            ];
        }

        return $data;
    }

    /**
     * Tout le dashboard en un seul appel.
     */
    public function getAll(): array
    {
        return [
            'stats'              => $this->getStats(),
            'alertes_stock'      => $this->getAlertesStock(),
            'alertes_peremption' => $this->getAlertesPeremption(),
            'ventes_recentes'    => $this->getVentesRecentes(),
            'top_medicaments'    => $this->getTopMedicaments(),
            'ventes_semaine'     => $this->getVentesSemaine(),
        ];
    }
}