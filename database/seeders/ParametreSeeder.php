<?php

namespace Database\Seeders;

use App\Models\Parametre;
use Illuminate\Database\Seeder;

class ParametreSeeder extends Seeder
{
    public function run(): void
    {
        $parametres = [
            // PHARMACIE
            ['pharmacie_nom',       'LGO Pharmacie Vétérinaire', 'string',  'pharmacie', 'Nom de la pharmacie', 'Affiché sur les tickets et factures'],
            ['pharmacie_adresse',   'Bujumbura, Burundi',        'string',  'pharmacie', 'Adresse', null],
            ['pharmacie_telephone', '+257 22 00 00 00',          'string',  'pharmacie', 'Téléphone', null],
            ['pharmacie_email',     'contact@lgo.bi',            'string',  'pharmacie', 'Email de contact', null],
            ['pharmacie_nif',       '',                          'string',  'pharmacie', 'NIF', 'Numéro d\'Identification Fiscale'],
            ['pharmacie_rc',        '',                          'string',  'pharmacie', 'Registre de commerce', null],

            // FACTURATION
            ['facturation_tva_defaut',     18,    'decimal', 'facturation', 'TVA par défaut (%)', 'Appliquée si non définie'],
            ['facturation_devise',         'BIF', 'string',  'facturation', 'Devise', 'Code ISO 4217'],
            ['facturation_prefixe_ticket', 'TKT', 'string',  'facturation', 'Préfixe du ticket', null],
            ['facturation_pied_ticket',    'Merci de votre visite', 'string', 'facturation', 'Message de pied de ticket', null],

            // STOCK
            ['stock_seuil_alerte_defaut', 10,   'integer', 'stock', 'Seuil d\'alerte par défaut', null],
            ['stock_alerte_j30',          true, 'boolean', 'stock', 'Alerte à J-30', null],
            ['stock_alerte_j7',           true, 'boolean', 'stock', 'Alerte à J-7', null],
            ['stock_fefo_actif',          true, 'boolean', 'stock', 'FEFO actif', 'Vendre en priorité les lots qui expirent'],

            // SYSTÈME
            ['systeme_maintenance',     false, 'boolean', 'systeme', 'Mode maintenance', 'Bloque l\'accès aux non-admins'],
            ['systeme_logs_retention',  1095,  'integer', 'systeme', 'Rétention des logs (jours)', '3 ans par défaut'],
            ['systeme_sauvegarde_auto', true,  'boolean', 'systeme', 'Sauvegarde automatique', 'Quotidienne à 02h00'],
        ];

        foreach ($parametres as $p) {
            [$cle, $valeur, $type, $groupe, $libelle] = $p;
            $description = $p[5] ?? null;

            $valeurStr = match ($type) {
                'json'    => json_encode($valeur),
                'boolean' => $valeur ? '1' : '0',
                default   => (string) $valeur,
            };

            Parametre::updateOrCreate(
                ['cle' => $cle],
                [
                    'valeur'      => $valeurStr,
                    'type'        => $type,
                    'groupe'      => $groupe,
                    'libelle'     => $libelle,
                    'description' => $description,
                ]
            );
        }

        $this->command->info('✅ ' . count($parametres) . ' paramètres créés/mis à jour.');
    }
}