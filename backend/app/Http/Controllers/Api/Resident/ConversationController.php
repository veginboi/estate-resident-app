<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ConversationController extends Controller
{
    /**
     * The resident's chats: the estate chatroom first, then one-to-one chats, most recent first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $this->joinEstateRoom($user);

        $unread = $this->unreadCounts($user);

        $conversations = $user->conversations()
            ->with(['participants:id,name,resident_code,allow_chat', 'latestMessage.user:id,name'])
            ->get()
            ->filter(fn (Conversation $c) => $c->isEstateRoom() || $c->latestMessage !== null)
            ->sortByDesc(fn (Conversation $c) => [$c->isEstateRoom() ? 1 : 0, $c->latestMessage?->id ?? 0])
            ->values()
            ->each(fn (Conversation $c) => $c->setAttribute('unread_count', $unread[$c->id] ?? 0));

        return ConversationResource::collection($conversations);
    }

    /**
     * One chat, for the header of the chat screen.
     */
    public function show(Request $request, Conversation $conversation): ConversationResource
    {
        $user = $request->user();
        abort_unless($conversation->isOpenTo($user), 404);

        $conversation->load(['participants:id,name,resident_code,allow_chat', 'latestMessage.user:id,name']);
        $conversation->setAttribute('unread_count', $this->unreadCounts($user)[$conversation->id] ?? 0);

        return new ConversationResource($conversation);
    }

    /**
     * Opens the one-to-one chat with another resident, starting it if needed.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['residentId' => ['required', 'integer', 'exists:users,id']]);
        $user = $request->user();
        $other = User::findOrFail($data['residentId']);

        if ($other->is($user)) {
            throw ValidationException::withMessages(['residentId' => "You can't start a chat with yourself."]);
        }
        if (! $other->allow_chat) {
            throw ValidationException::withMessages(['residentId' => "{$other->name} isn't accepting messages."]);
        }

        $conversation = Conversation::between($user, $other);
        $conversation->load(['participants:id,name,resident_code,allow_chat', 'latestMessage.user:id,name']);
        $conversation->setAttribute('unread_count', $this->unreadCounts($user)[$conversation->id] ?? 0);

        return (new ConversationResource($conversation))
            ->response()
            ->setStatusCode($conversation->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Total unread messages across all chats, for the badge on the Messages link.
     */
    public function unread(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->joinEstateRoom($user);

        return response()->json(['data' => ['count' => (int) $this->unreadCounts($user)->sum()]]);
    }

    /**
     * Adds the resident to the estate chatroom's read tracking. Messages from before they
     * joined don't count as unread.
     */
    private function joinEstateRoom(User $user): void
    {
        $room = Conversation::estateRoom();

        if (! $room->participants()->whereKey($user->id)->exists()) {
            $room->addParticipant($user->id, $room->messages()->max('id'));
        }
    }

    /**
     * Unread messages per chat: messages from other residents posted after the last one this
     * resident read.
     *
     * @return Collection<int, int>
     */
    private function unreadCounts(User $user): Collection
    {
        return DB::table('messages as m')
            ->join('conversation_user as cu', function ($join) use ($user) {
                $join->on('cu.conversation_id', '=', 'm.conversation_id')->where('cu.user_id', '=', $user->id);
            })
            ->where('m.user_id', '!=', $user->id)
            ->whereRaw('m.id > coalesce(cu.last_read_message_id, 0)')
            ->groupBy('m.conversation_id')
            ->selectRaw('m.conversation_id, count(*) as unread')
            ->pluck('unread', 'conversation_id')
            ->map(fn ($count) => (int) $count);
    }
}
