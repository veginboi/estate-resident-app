<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NeighbourController extends Controller
{
    /**
     * Residents the signed-in resident can start a chat with: everyone who has
     * "All Members Can Chat With Me" switched on. Only names, resident codes and
     * plots are shared, never contact details.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:100']]);
        $search = mb_strtolower(trim((string) $request->query('q')));

        $neighbours = User::query()
            ->whereKeyNot($request->user()->id)
            ->where('allow_chat', true)
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $query->where(fn ($q) => $q
                    ->whereRaw('lower(name) like ?', [$like])
                    ->orWhereRaw('lower(resident_code) like ?', [$like]));
            })
            ->with('plot:id,user_id,label')
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name', 'resident_code']);

        return response()->json([
            'data' => $neighbours->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'residentCode' => $u->resident_code,
                'plot' => $u->plot?->label,
            ])->values(),
        ]);
    }
}
