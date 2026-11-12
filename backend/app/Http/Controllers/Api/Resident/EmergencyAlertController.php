<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmergencyAlertController extends Controller
{
    /**
     * Raise a "life under threat" alert for estate security.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate(['note' => ['nullable', 'string', 'max:500']]);

        $user = $request->user();
        $alert = $user->emergencyAlerts()->create([
            'note' => $validated['note'] ?? null,
            'status' => 'open',
        ]);

        // Security/admin notification goes here once the admin app exists.
        Log::alert('Emergency alert raised', [
            'alert_id' => $alert->id,
            'resident' => $user->resident_code,
            'plot' => $user->plot?->code,
        ]);

        return response()->json([
            'data' => [
                'id' => $alert->id,
                'status' => $alert->status,
                'emergencyLine' => config('estate.emergency_line'),
            ],
        ], 201);
    }
}
