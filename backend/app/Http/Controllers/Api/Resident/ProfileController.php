<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\ProfileResource;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function show(Request $request): ProfileResource
    {
        return new ProfileResource($request->user());
    }

    public function update(UpdateProfileRequest $request): ProfileResource
    {
        $user = $request->user();
        $user->update($request->validated());

        return new ProfileResource($user);
    }
}
