<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Requests\FamilyMemberRequest;
use App\Http\Resources\FamilyMemberResource;
use App\Models\FamilyMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class FamilyMemberController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return FamilyMemberResource::collection($request->user()->familyMembers()->orderBy('id')->get());
    }

    public function store(FamilyMemberRequest $request): JsonResponse
    {
        $member = $request->user()->familyMembers()->create($request->validated());

        return (new FamilyMemberResource($member))->response()->setStatusCode(201);
    }

    public function update(FamilyMemberRequest $request, FamilyMember $familyMember): FamilyMemberResource
    {
        $this->ensureOwnedBy($request, $familyMember);

        $familyMember->update($request->validated());

        return new FamilyMemberResource($familyMember);
    }

    public function destroy(Request $request, FamilyMember $familyMember): Response
    {
        $this->ensureOwnedBy($request, $familyMember);

        $familyMember->delete();

        return response()->noContent();
    }

    private function ensureOwnedBy(Request $request, FamilyMember $familyMember): void
    {
        abort_unless($familyMember->user()->is($request->user()), 404);
    }
}
