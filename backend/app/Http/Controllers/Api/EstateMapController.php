<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlotResource;
use App\Models\Plot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EstateMapController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $plots = Plot::with('user:id,name')->orderBy('id')->get();

        return response()->json([
            'data' => [
                'width' => config('estate.map.width'),
                'height' => config('estate.map.height'),
                'roads' => config('estate.map.roads'),
                'plots' => PlotResource::collection($plots)->resolve($request),
            ],
        ]);
    }
}
