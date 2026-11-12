<?php

namespace App\Http\Resources;

use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Message
 */
class MessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'createdAt' => $this->created_at->toIso8601String(),
            'sender' => ['id' => $this->user_id, 'name' => $this->user?->name ?? 'Former resident'],
            'mine' => $this->user_id === $request->user()?->id,
        ];
    }
}
