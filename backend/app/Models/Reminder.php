<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A reminder shown on the resident's dashboard.
 */
#[Fillable(['user_id', 'text', 'remind_at', 'done_at'])]
class Reminder extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'remind_at' => 'datetime',
            'done_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
