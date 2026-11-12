<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Requests\PropertyRequest;
use App\Http\Resources\PropertyResource;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PropertyController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return PropertyResource::collection($request->user()->properties()->orderBy('id')->get());
    }

    public function store(PropertyRequest $request): JsonResponse
    {
        $property = $request->user()->properties()->create($request->validated());

        return (new PropertyResource($property))->response()->setStatusCode(201);
    }

    public function update(PropertyRequest $request, Property $property): PropertyResource
    {
        $this->ensureOwnedBy($request, $property);

        $property->update($request->validated());

        return new PropertyResource($property);
    }

    public function destroy(Request $request, Property $property): Response
    {
        $this->ensureOwnedBy($request, $property);

        $property->delete();

        return response()->noContent();
    }

    private function ensureOwnedBy(Request $request, Property $property): void
    {
        abort_unless($property->user()->is($request->user()), 404);
    }
}
