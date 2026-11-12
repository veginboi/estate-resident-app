<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

/**
 * A chat. Either the estate chatroom, which every resident can read and post in,
 * or a one-to-one chat between two residents.
 */
#[Fillable(['type', 'key'])]
class Conversation extends Model
{
    public const ESTATE = 'estate';

    public const DIRECT = 'direct';

    /**
     * The estate chatroom, created the first time anyone opens Messages.
     */
    public static function estateRoom(): self
    {
        return static::createOrFirst(['key' => self::ESTATE], ['type' => self::ESTATE]);
    }

    /**
     * The one-to-one chat between two residents, created if they haven't chatted before.
     */
    public static function between(User $a, User $b): self
    {
        [$low, $high] = $a->id < $b->id ? [$a->id, $b->id] : [$b->id, $a->id];

        $conversation = static::createOrFirst(['key' => "direct:{$low}:{$high}"], ['type' => self::DIRECT]);
        $conversation->addParticipant($low);
        $conversation->addParticipant($high);

        return $conversation;
    }

    public function isEstateRoom(): bool
    {
        return $this->type === self::ESTATE;
    }

    /**
     * Whether this resident can read and post in the chat.
     */
    public function isOpenTo(User $user): bool
    {
        return $this->isEstateRoom() || $this->participants()->whereKey($user->id)->exists();
    }

    /**
     * Records that the resident has read up to this message. Never moves backwards.
     */
    public function markReadBy(User $user, ?int $messageId): void
    {
        if ($messageId === null) {
            return;
        }

        $this->addParticipant($user->id);
        $this->participants()->newPivotStatementForId($user->id)
            ->where(fn ($q) => $q->whereNull('last_read_message_id')->orWhere('last_read_message_id', '<', $messageId))
            ->update(['last_read_message_id' => $messageId, 'updated_at' => now()]);
    }

    /**
     * Adds a resident to the chat if they aren't in it already. Safe to call twice at once.
     */
    public function addParticipant(int $userId, ?int $lastReadMessageId = null): void
    {
        DB::table('conversation_user')->insertOrIgnore([
            'conversation_id' => $this->id,
            'user_id' => $userId,
            'last_read_message_id' => $lastReadMessageId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('last_read_message_id')->withTimestamps();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }
}
