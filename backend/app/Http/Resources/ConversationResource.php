<?php

namespace App\Http\Resources;

use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A chat as shown in the resident's chat list. Set `unread_count` on the model before
 * returning it; it defaults to 0.
 *
 * @mixin Conversation
 */
class ConversationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $me = $request->user();
        $other = $this->isEstateRoom()
            ? null
            : $this->participants->first(fn ($user) => $user->id !== $me->id);
        $last = $this->latestMessage;

        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->isEstateRoom() ? config('estate.name').' Chatroom' : ($other?->name ?? 'Former resident'),
            'resident' => $other ? [
                'id' => $other->id,
                'name' => $other->name,
                'residentCode' => $other->resident_code,
                'acceptsMessages' => (bool) $other->allow_chat,
            ] : null,
            'lastMessage' => $last ? [
                'body' => $last->body,
                'createdAt' => $last->created_at->toIso8601String(),
                'senderName' => $last->user?->name ?? 'Former resident',
                'mine' => $last->user_id === $me->id,
            ] : null,
            'unreadCount' => (int) ($this->unread_count ?? 0),
        ];
    }
}
