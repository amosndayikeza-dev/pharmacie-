<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use app\Models\User;
use Illuminate\Support\Facades\Hash;

class user_seeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
            // Admin
        User::create([
            'name'     => 'Admin Aspa',
            'email'    => 'admin@aspangozi.com',
            'password' => Hash::make('password123'),
            'role'     => 'admin',
            'actif'    => true,
        ]);

        // Pharmacien
        User::create([
            'name'     => 'Jean Pharmacien',
            'email'    => 'pharmacien@aspangozi.com',
            'password' => Hash::make('password123'),
            'role'     => 'pharmacien',
            'actif'    => true,
        ]);

        // Vendeur
        User::create([
            'name'     => 'Marie Vendeuse',
            'email'    => 'vendeur@aspangozi.com',
            'password' => Hash::make('password123'),
            'role'     => 'vendeur',
            'actif'    => true,
            
        ]);
    }
}
