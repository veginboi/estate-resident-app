<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Resources\ActivityResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ActivityController extends Controller
{
    /**
     * The household's gate check-in / check-out records, newest first.
     * Pass ?date=YYYY-MM-DD to show a single day.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate(['date' => ['nullable', 'date_format:Y-m-d']]);

        $activities = $request->user()->activities()
            ->when($request->query('date'), fn ($query, $date) => $query->whereDate('date', $date))
            ->orderByDesc('date')
            ->orderByDesc('out_at')
            ->limit(200)
            ->get();

        return ActivityResource::collection($activities);
    }
}
