<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use app\Models\Medicament;
class MedicamentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // medicament
       $medicaments = [
            [
                'code_cip'                => 'CIP001',
                'code_barre'              => 'BAR001',
                'nom'                     => 'Amoxicilline 500mg',
                'denomination_commune'    => 'Amoxicilline',
                'forme'                   => 'comprimé',
                'dosage'                  => '500mg',
                'laboratoire'             => 'VetPharma',
                'categorie'               => 'antibiotique',
                'sur_ordonnance'          => false,
                'usage_preventif'         => false,
                'posologie'               => '1 comprimé matin et soir',
                'voie_administration'     => 'oral',
                'delai_attente'           => '7 jours',
                'prix_vente_ttc_reference'=> 5000,
                'taux_tva'                => 18,
                'seuil_alerte'            => 10,
                'stock_max'               => 100,
                'actif'                   => true,
            ],
            [
                'code_cip'                => 'CIP002',
                'code_barre'              => 'BAR002',
                'nom'                     => 'Ivermectine 1%',
                'denomination_commune'    => 'Ivermectine',
                'forme'                   => 'injectable',
                'dosage'                  => '1%',
                'laboratoire'             => 'MediVet',
                'categorie'               => 'antiparasitaire',
                'sur_ordonnance'          => false,
                'usage_preventif'         => true,
                'posologie'               => '1ml par 50kg',
                'voie_administration'     => 'injection',
                'delai_attente'           => '28 jours',
                'prix_vente_ttc_reference'=> 8000,
                'taux_tva'                => 18,
                'seuil_alerte'            => 5,
                'stock_max'               => 50,
                'actif'                   => true,
            ],
            [
                'code_cip'                => 'CIP003',
                'code_barre'              => 'BAR003',
                'nom'                     => 'Vaccin Rage',
                'denomination_commune'    => 'Vaccin antirabique',
                'forme'                   => 'injectable',
                'dosage'                  => '1 dose',
                'laboratoire'             => 'AnimalMed',
                'categorie'               => 'vaccin',
                'sur_ordonnance'          => true,
                'usage_preventif'         => true,
                'posologie'               => '1 dose par animal',
                'voie_administration'     => 'injection',
                'delai_attente'           => '0 jours',
                'prix_vente_ttc_reference'=> 12000,
                'taux_tva'                => 18,
                'seuil_alerte'            => 20,
                'stock_max'               => 200,
                'actif'                   => true,
            ],
        ];
        foreach ($medicaments as $medicament) {
            Medicament::create($medicament);
        }
    }
}
