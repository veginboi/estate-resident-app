<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdatePasswordRequest;
use Illuminate\Http\Response;
use Laravel\Sanctum\PersonalAccessToken;

class PasswordController extends Controller
{
    /**
     * Change the password and sign out every other device.
     */
    public function update(UpdatePasswordRequest $request): Response
    {
        $user = $request->user();
        $user->update(['password' => $request->validated('password')]);

        $current = $user->currentAccessToken();

        $user->tokens()
            ->when($current instanceof PersonalAccessToken, fn ($query) => $query->whereKeyNot($current->getKey()))
            ->delete();

        return response()->noContent();
    }
}
