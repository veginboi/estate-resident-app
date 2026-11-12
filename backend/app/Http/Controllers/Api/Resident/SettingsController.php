<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateSettingsRequest;
use App\Http\Resources\SettingsResource;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show(Request $request): SettingsResource
    {
        return new SettingsResource($request->user());
    }

    public function update(UpdateSettingsRequest $request): SettingsResource
    {
        $user = $request->user();
        $user->update($request->toColumns());

        return new SettingsResource($user);
    }
}
