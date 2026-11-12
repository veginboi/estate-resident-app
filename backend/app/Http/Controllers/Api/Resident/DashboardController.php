<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Resources\EstateUpdateResource;
use App\Http\Resources\ReminderResource;
use App\Models\EstateUpdate;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        $reminders = $user->reminders()
            ->where('remind_at', '>=', today()->subDays(7))
            ->orderBy('remind_at')
            ->limit(20)
            ->get();

        $updates = EstateUpdate::where('published_at', '<=', now())
            ->latest('published_at')
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'stats' => [
                    'neighbors' => User::whereKeyNot($user->id)->whereHas('plot')->count(),
                    'totalPayments' => (float) $user->payments()->sum('amount'),
                    'familyActivities' => $user->activities()->whereDate('date', today())->count(),
                ],
                'reminders' => ReminderResource::collection($reminders)->resolve($request),
                'updates' => EstateUpdateResource::collection($updates)->resolve($request),
            ],
        ]);
    }
}
