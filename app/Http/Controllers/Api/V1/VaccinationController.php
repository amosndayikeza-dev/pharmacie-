<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreVaccinationRequest;
use App\Http\Requests\Api\V1\UpdateVaccinationRequest;
use App\Http\Resources\VaccinationResource;
use App\Models\Vaccination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Controller API des vaccinations.
 */
class VaccinationController extends Controller
{
    /**
     * Liste paginée des vaccinations.
     *
     * GET /api/v1/vaccinations
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Vaccination::query()
            ->with(['animal', 'veterinaire', 'medicament'])
            ->when($request->filled('animal_id'), fn ($q) => $q->where('animal_id', $request->animal_id))
            ->when($request->filled('veterinaire_id'), fn ($q) => $q->where('veterinaire_id', $request->veterinaire_id))
            ->when($request->filled('medicament_id'), fn ($q) => $q->where('medicament_id', $request->medicament_id))
            ->when($request->filled('search'), fn ($q) => $q->where('nom_vaccin', 'like', "%{$request->search}%"))
            ->when($request->filled('date_debut'), fn ($q) => $q->whereDate('date_vaccination', '>=', $request->date_debut))
            ->when($request->filled('date_fin'), fn ($q) => $q->whereDate('date_vaccination', '<=', $request->date_fin))
            ->when($request->boolean('rappel_proche'), fn ($q) => $q->aRappelProche((int) $request->input('jours', 30)))
            ->when($request->boolean('en_retard'), fn ($q) => $q->enRetard())
            ->orderBy('date_vaccination', 'desc');

        return VaccinationResource::collection(
            $query->paginate($request->input('per_page', 20))
        );
    }

    /**
     * Détail d'une vaccination.
     * GET /api/v1/vaccinations/{id}
     */
    public function show(int $id): JsonResponse
    {
        $vaccination = Vaccination::with(['animal', 'veterinaire', 'medicament'])
            ->findOrFail($id);

        return response()->json([
            'data' => new VaccinationResource($vaccination),
        ]);
    }

    /**
     * Créer une vaccination.
     * POST /api/v1/vaccinations
     */
    public function store(StoreVaccinationRequest $request): JsonResponse
    {
        $vaccination = Vaccination::create($request->validated());
        $vaccination->load(['animal', 'veterinaire', 'medicament']);

        return response()->json([
            'message' => 'Vaccination enregistrée avec succès.',
            'data'    => new VaccinationResource($vaccination),
        ], 201);
    }

    /**
     * Modifier une vaccination.
     * PUT /api/v1/vaccinations/{id}
     */
    public function update(UpdateVaccinationRequest $request, int $id): JsonResponse
    {
        $vaccination = Vaccination::findOrFail($id);
        $vaccination->update($request->validated());

        return response()->json([
            'message' => 'Vaccination modifiée avec succès.',
            'data'    => new VaccinationResource($vaccination->fresh(['animal', 'veterinaire', 'medicament'])),
        ]);
    }

    /**
     * Supprimer une vaccination.
     * DELETE /api/v1/vaccinations/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $vaccination = Vaccination::findOrFail($id);
        $vaccination->delete();

        return response()->json([
            'message' => 'Vaccination supprimée.',
        ]);
    }

    /**
     * Liste des rappels à venir (dans les X prochains jours).
     * GET /api/v1/vaccinations/rappels?jours=30
     */
    public function rappels(Request $request): AnonymousResourceCollection
    {
        $jours = (int) $request->input('jours', 30);

        $vaccinations = Vaccination::query()
            ->with(['animal.proprietaire', 'veterinaire'])
            ->aRappelProche($jours)
            ->orderBy('date_prochain_rappel', 'asc')
            ->get();

        return VaccinationResource::collection($vaccinations);
    }

    /**
     * Liste des rappels en retard.
     * GET /api/v1/vaccinations/rappels-en-retard
     */
    public function rappelsEnRetard(): AnonymousResourceCollection
    {
        $vaccinations = Vaccination::query()
            ->with(['animal.proprietaire', 'veterinaire'])
            ->enRetard()
            ->orderBy('date_prochain_rappel', 'asc')
            ->get();

        return VaccinationResource::collection($vaccinations);
    }
}