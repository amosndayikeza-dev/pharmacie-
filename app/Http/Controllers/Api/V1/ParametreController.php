<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Parametre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Controller API des paramètres de l'application.
 */
class ParametreController extends Controller
{
    /**
     * Liste tous les paramètres, groupés.
     *
     * GET /api/v1/parametres
     */
    public function index(): JsonResponse
    {
        $parametres = Parametre::orderBy('groupe')->orderBy('cle')->get();

        $groupes = [];
        foreach ($parametres as $p) {
            $groupes[$p->groupe][] = [
                'cle'         => $p->cle,
                'valeur'      => $p->valeurTypee(),
                'type'        => $p->type,
                'libelle'     => $p->libelle,
                'description' => $p->description,
            ];
        }

        return response()->json(['data' => $groupes]);
    }

    /**
     * Paramètres d'un groupe.
     *
     * GET /api/v1/parametres/groupe/{groupe}
     */
    public function parGroupe(string $groupe): JsonResponse
    {
        $parametres = Parametre::where('groupe', $groupe)->get()->map(fn ($p) => [
            'cle'         => $p->cle,
            'valeur'      => $p->valeurTypee(),
            'type'        => $p->type,
            'libelle'     => $p->libelle,
            'description' => $p->description,
        ]);

        return response()->json(['data' => $parametres]);
    }

    /**
     * Mise à jour en masse.
     *
     * PUT /api/v1/parametres
     * Body: { "parametres": { "pharmacie_nom": "...", "tva_defaut": 18 } }
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'parametres'   => ['required', 'array'],
            'parametres.*' => ['nullable'],
        ]);

        $modifies = 0;

        foreach ($request->input('parametres') as $cle => $valeur) {
            $param = Parametre::where('cle', $cle)->first();
            if (! $param) continue;

            $valeurStr = match ($param->type) {
                'json'    => is_string($valeur) ? $valeur : json_encode($valeur),
                'boolean' => $valeur ? '1' : '0',
                default   => $valeur === null ? null : (string) $valeur,
            };

            $param->update(['valeur' => $valeurStr]);
            $modifies++;
        }

        return response()->json([
            'message'  => "{$modifies} paramètre(s) mis à jour.",
            'modifies' => $modifies,
        ]);
    }
}