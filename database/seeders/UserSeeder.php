<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin
        User::create([
            'nom'      => 'Aspa',
            'prenom'   => 'Admin',
            'email'    => 'admin@aspangozi.com',
            'password' => Hash::make('password123'),
            'role'     => 'Administrateur',
            'actif'    => true,
        ]);

        // Pharmacien
        User::create([
            'nom'      => 'Pharmacien',
            'prenom'   => 'Jean',
            'email'    => 'pharmacien@aspangozi.com',
            'password' => Hash::make('password123'),
            'role'     => 'Pharmacien',
            'actif'    => true,
        ]);

        // Vendeur
        User::create([
            'nom'      => 'Vendeuse',
            'prenom'   => 'Marie',
            'email'    => 'vendeur@aspangozi.com',
            'password' => Hash::make('password123'),
            'role'     => 'Vendeur',
            'actif'    => true,
        ]);
    }
}