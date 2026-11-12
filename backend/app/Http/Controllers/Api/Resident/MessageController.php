<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class MessageController extends Controller
{
    private const PAGE_SIZE = 50;

    /**
     * Messages in a chat, oldest first.
     *
     * - No parameters: the latest 50 messages.
     * - ?after={id}: messages newer than that one. The apps poll this every few seconds.
     * - ?before={id}: the 50 messages before that one, for scrolling back through history.
     *
     * Loading the latest messages marks them as read.
     */
    public function index(Request $request, Conversation $conversation): AnonymousResourceCollection
    {
        $user = $request->user();
        abort_unless($conversation->isOpenTo($user), 404);

        $request->validate([
            'after' => ['nullable', 'integer', 'min:0'],
            'before' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $conversation->messages()->with('user:id,name');
        $hasMore = false;

        if ($request->filled('after')) {
            $messages = $query->where('id', '>', (int) $request->query('after'))->orderBy('id')->limit(200)->get();
        } else {
            $page = $query
                ->when($request->filled('before'), fn ($q) => $q->where('id', '<', (int) $request->query('before')))
                ->orderByDesc('id')
                ->limit(self::PAGE_SIZE + 1)
                ->get();
            $hasMore = $page->count() > self::PAGE_SIZE;
            $messages = $page->take(self::PAGE_SIZE)->reverse()->values();
        }

        if (! $request->filled('before')) {
            $conversation->markReadBy($user, $messages->max('id'));
        }

        return MessageResource::collection($messages)->additional(['meta' => ['hasMore' => $hasMore]]);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        abort_unless($conversation->isOpenTo($user), 404);

        $request->merge(['body' => is_string($request->body) ? trim($request->body) : $request->body]);
        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);

        if (! $conversation->isEstateRoom()) {
            $other = $conversation->participants()->whereKeyNot($user->id)->first();
            if (! $other?->allow_chat) {
                throw ValidationException::withMessages([
                    'body' => ($other?->name ?? 'This resident')." isn't accepting messages.",
                ]);
            }
        }

        $message = $conversation->messages()->create(['user_id' => $user->id, 'body' => $data['body']]);
        $conversation->touch();
        $conversation->markReadBy($user, $message->id);

        return (new MessageResource($message->load('user:id,name')))->response()->setStatusCode(201);
    }
}
