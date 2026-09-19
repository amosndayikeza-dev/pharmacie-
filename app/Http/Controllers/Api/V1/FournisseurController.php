<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use app\Models\Fournisseur;
use Illuminate\Http\JsonResponse;

class FournisseurController extends Controller
{
    //lister touts les fournisseurs
    //GET api/V1/fournisseur
    public function index(Request $request): JsonResponse
{
    $fournisseurs = Fournisseur::query()
        ->when($request->filled('search'), function($q) use ($request) {
            $q->where('nom', 'like', "%{$request->search}%");
        })
        ->when($request->filled('actif'), function($q) use ($request) {
            $q->where('actif', $request->boolean('actif'));
        })
        ->orderBy('nom')
        ->get();

    return response()->json($fournisseurs);
}
    
    
    public function show(){}


    public function store(){}


    public function update(){}


    public function destroy(){}


}
