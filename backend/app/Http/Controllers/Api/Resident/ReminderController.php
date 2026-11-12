<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReminderResource;
use App\Models\Reminder;
use Illuminate\Http\Request;

class ReminderController extends Controller
{
    /**
     * Mark a reminder as done or not done.
     */
    public function update(Request $request, Reminder $reminder): ReminderResource
    {
        abort_unless($reminder->user()->is($request->user()), 404);

        $validated = $request->validate(['done' => ['required', 'boolean']]);

        $reminder->update(['done_at' => $validated['done'] ? now() : null]);

        return new ReminderResource($reminder);
    }
}
