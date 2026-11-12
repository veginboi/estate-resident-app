<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\ProfileResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Create a resident account and sign the new resident in straight away.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'resident_code' => $this->newResidentCode(),
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
        ]);

        $token = $user->createToken($data['device_name'] ?? 'resident-app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new ProfileResource($user),
        ], 201);
    }

    /**
     * Log a resident in and return an API token for the app to send as a Bearer token.
     */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::where('email', strtolower(trim($credentials['email'])))->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => 'These credentials do not match our records.',
            ]);
        }

        $token = $user->createToken($credentials['device_name'] ?? 'resident-app')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => new ProfileResource($user),
        ]);
    }

    /**
     * Revoke the token used for this request.
     */
    public function logout(Request $request): Response
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->noContent();
    }

    /**
     * A unique resident code such as "LE4K7Q2M", shown on the resident's profile.
     */
    private function newResidentCode(): string
    {
        do {
            $code = 'LE'.strtoupper(Str::random(6));
        } while (User::where('resident_code', $code)->exists());

        return $code;
    }
}
