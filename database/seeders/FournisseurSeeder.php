<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use app\Models\Fournisseur;

class FournisseurSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //fournisseur 


         $fournisseurs = [
            [
                'nom'                   => 'VetPharma Congo',
                'raison_sociale'        => 'VetPharma Congo SARL',
                'numero_contribuable'   => 'CD123456789',
                'telephone'             => '+243810000001',
                'email'                 => 'contact@vetpharma.cd',
                'adresse'               => 'Avenue Kasa-Vubu',
                'ville'                 => 'Kinshasa',
                'pays'                  => 'RDC',
                'delai_livraison_jours' => 3,
                'notes'                 => 'Fournisseur principal',
                'actif'                 => true,
            ],
            [
                'nom'                   => 'MediVet Burundi',
                'raison_sociale'        => 'MediVet Burundi SARL',
                'numero_contribuable'   => 'BI987654321',
                'telephone'             => '+25779000001',
                'email'                 => 'contact@medivet.bi',
                'adresse'               => 'Avenue du Large',
                'ville'                 => 'Bujumbura',
                'pays'                  => 'Burundi',
                'delai_livraison_jours' => 2,
                'notes'                 => 'Fournisseur local',
                'actif'                 => true,
            ],
            [
                'nom'                   => 'AnimalMed Rwanda',
                'raison_sociale'        => 'AnimalMed Rwanda Ltd',
                'numero_contribuable'   => 'RW456789123',
                'telephone'             => '+25078000001',
                'email'                 => 'contact@animalmed.rw',
                'adresse'              => 'KG 123 Street',
                'ville'                 => 'Kigali',
                'pays'                  => 'Rwanda',
                'delai_livraison_jours' => 5,
                'notes'                 => 'Fournisseur secondaire',
                'actif'                 => true,
            ],
        ];

        foreach ($fournisseurs as $fournisseur) {
            Fournisseur::create($fournisseur);
        }
    }
}
