<?php

namespace App\Services;

use App\Models\Animal;
use App\Models\Lot;
use App\Models\Medicament;
use App\Models\Vente;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Models\ReglementCredit;

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

        // ─────────────────────────────────────────────────────────
        // CA FACTURÉ (toutes ventes, payées ou non)
        // ─────────────────────────────────────────────────────────
        $caFactureJour = Vente::whereDate('date_heure', $aujourdhui)
            ->where('statut', 'validee')
            ->sum('montant_total_ttc');

        $caFactureMois = Vente::where('date_heure', '>=', $debutMois)
            ->where('statut', 'validee')
            ->sum('montant_total_ttc');

        // ─────────────────────────────────────────────────────────
        // CA ENCAISSÉ (espèces + règlements de crédit)
        // ─────────────────────────────────────────────────────────
        $caEncaisseJour = (float) \App\Models\Paiement::where('type', 'especes')
            ->whereDate('created_at', $aujourdhui)
            ->sum('montant')
            + (float) \App\Models\ReglementCredit::whereDate('date_heure', $aujourdhui)
                ->sum('montant');

        $caEncaisseMois = (float) \App\Models\Paiement::where('type', 'especes')
            ->where('created_at', '>=', $debutMois)
            ->sum('montant')
            + (float) \App\Models\ReglementCredit::where('date_heure', '>=', $debutMois)
                ->sum('montant');

        // ─────────────────────────────────────────────────────────
        // CRÉANCES (dettes clients actuelles)
        // ─────────────────────────────────────────────────────────
        $totalCredits = (float) \App\Models\Paiement::where('type', 'credit')->sum('montant');
        $totalRegle   = (float) \App\Models\ReglementCredit::sum('montant');
        $creances     = $totalCredits - $totalRegle;

        // Nombre de tickets du jour
        $ticketsJour = Vente::whereDate('date_heure', $aujourdhui)
            ->where('statut', 'validee')
            ->count();

        // Bénéfice (marge brute) du mois
        $beneficeMois = (float) \App\Models\LigneVente::whereHas('vente', fn ($q) =>
            $q->where('date_heure', '>=', $debutMois)->where('statut', 'validee')
        )->sum('marge_brute');

        return [
            'ca_facture_jour'   => (float) $caFactureJour,
            'ca_facture_mois'   => (float) $caFactureMois,
            'ca_encaisse_jour'  => $caEncaisseJour,
            'ca_encaisse_mois'  => $caEncaisseMois,
            'creances'          => $creances,
            'benefice_mois'     => $beneficeMois,
            'tickets_jour'      => $ticketsJour,
            'nb_animaux'        => Animal::where('vivant', true)->count(),
            'nb_medicaments'    => Medicament::where('actif', true)->count(),
            'nb_lots'           => Lot::where('quantite_restante', '>', 0)->count(),   // ⚠️ AJOUT
            'nb_lots_perimes'   => Lot::perimes()->count(),
            'nb_lots_alerte'    => Lot::expirantDans(30)->count(),
        ];
    }

    /**
 * Évolution financière sur les 7 derniers jours.
 *
 * Retourne pour chaque jour :
 *   - Le CA facturé (toutes les ventes)
 *   - Le CA encaissé (paiements espèces + règlements de crédit)
 *
 * Utilisé pour le graphique comparatif.
 */
public function getEvolutionFinance(): array
{
    $data = [];

    for ($i = 6; $i >= 0; $i--) {
        $date = \Carbon\Carbon::today()->subDays($i);

        // CA facturé du jour
        $facture = (float) Vente::whereDate('date_heure', $date)
            ->where('statut', 'validee')
            ->sum('montant_total_ttc');

        // CA encaissé du jour (espèces + règlements crédit)
        $encaisseEspeces = (float) \App\Models\Paiement::where('type', 'especes')
            ->whereDate('created_at', $date)
            ->sum('montant');

        $encaisseReglements = (float) \App\Models\ReglementCredit::whereDate('date_heure', $date)
            ->sum('montant');

        $encaisse = $encaisseEspeces + $encaisseReglements;

        $data[] = [
            'date'      => $date->toDateString(),
            'label'     => $date->locale('fr')->isoFormat('ddd D'),
            'facture'   => $facture,
            'encaisse'  => $encaisse,
        ];
    }

    return $data;
}

/**
 * Répartition paiements (espèces vs crédit) sur le mois en cours.
 */
public function getRepartitionPaiementsMois(): array
{
    $debutMois = \Carbon\Carbon::now()->startOfMonth();

    $especes = (float) \App\Models\Paiement::where('type', 'especes')
        ->where('created_at', '>=', $debutMois)
        ->sum('montant');

    $credits = (float) \App\Models\Paiement::where('type', 'credit')
        ->where('created_at', '>=', $debutMois)
        ->sum('montant');

    $reglements = (float) \App\Models\ReglementCredit::where('date_heure', '>=', $debutMois)
        ->sum('montant');

    // Espèces = paiements espèces + règlements encaissés
    $especesTotal = $especes + $reglements;

    // Crédits = montant initial - réglé
    $creditsRestants = max(0, $credits - $reglements);

    return [
        'especes'  => $especesTotal,
        'credits'  => $creditsRestants,
        'total'    => $especesTotal + $creditsRestants,
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
    /**
 * Récupère les 5 dernières ventes (tous statuts sauf annulée/avoir).
 *
 * ⚠️ On inclut 'partielle' et 'credit' pour voir les ventes à crédit récentes.
 */
public function getVentesRecentes(int $limit = 5): array
{
    return Vente::with([
            'proprietaire:id,nom,prenom,raison_sociale,type',
            'animal:id,nom,espece_id',
            'animal.espece:id,nom',              // ← nom de l'espèce
            'utilisateur:id,nom,prenom',
        ])
        ->whereIn('statut', ['validee', 'partielle', 'credit'])   // ⚠️ tous les statuts actifs
        ->orderByDesc('date_heure')
        ->limit($limit)
        ->get()
        ->map(function (Vente $vente) {
            // Nom du client (particulier ou structure)
            $proprietaire = $vente->proprietaire;
            $clientNom = 'Client anonyme';

            if ($proprietaire) {
                $clientNom = $proprietaire->type === 'particulier'
                    ? trim("{$proprietaire->prenom} {$proprietaire->nom}")
                    : ($proprietaire->raison_sociale ?? $proprietaire->nom);
            }

            // Nom de l'animal (avec espèce si dispo)
            $animal = $vente->animal;
            $animalNom = null;
            if ($animal) {
                $animalNom = $animal->nom
                    ? $animal->nom
                    : 'Animal #' . $animal->id;

                if ($animal->espece?->nom) {
                    $animalNom .= ' (' . $animal->espece->nom . ')';
                }
            }

            return [
                'id'            => $vente->id,
                'numero_ticket' => $vente->numero_ticket,
                'date_heure'    => $vente->date_heure?->toISOString(),
                'montant_ttc'   => (float) $vente->montant_total_ttc,
                'proprietaire'  => $clientNom,
                'animal'        => $animalNom,
                'statut'        => $vente->statut,
                'vendeur'       => $vente->utilisateur
                    ? trim("{$vente->utilisateur->prenom} {$vente->utilisateur->nom}")
                    : '—',
            ];
        })
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
        'stats'                => $this->getStats(),
        'evolution_finance'    => $this->getEvolutionFinance(),      
        'repartition_mois'     => $this->getRepartitionPaiementsMois(),
        'alertes_stock'        => $this->getAlertesStock(),
        'alertes_peremption'   => $this->getAlertesPeremption(),
        'ventes_recentes'      => $this->getVentesRecentes(),
        'top_medicaments'      => $this->getTopMedicaments(),
        'ventes_semaine'       => $this->getVentesSemaine(),
    ];
}
}