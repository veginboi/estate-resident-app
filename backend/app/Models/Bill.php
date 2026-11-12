<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A bill or due issued to a resident: service charge, levies, and so on.
 */
#[Fillable(['user_id', 'title', 'description', 'amount', 'due_date', 'paid_at'])]
class Bill extends Model
{
    use HasFactory;

    public const UNPAID = 'unpaid';

    public const OVERDUE = 'overdue';

    public const PENDING = 'pending';

    public const PAID = 'paid';

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'due_date' => 'date',
            'paid_at' => 'datetime',
        ];
    }

    /**
     * paid, pending (a receipt is waiting for confirmation), overdue or unpaid.
     * Needs the latestProof relation loaded (or loads it).
     */
    public function status(): string
    {
        if ($this->paid_at !== null) {
            return self::PAID;
        }
        if ($this->latestProof?->status === PaymentProof::PENDING) {
            return self::PENDING;
        }

        return $this->due_date->isBefore(today()) ? self::OVERDUE : self::UNPAID;
    }

    /**
     * Bills that still need paying (including ones with a receipt awaiting confirmation).
     */
    public function scopeOpen(Builder $query): void
    {
        $query->whereNull('paid_at');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function proofs(): HasMany
    {
        return $this->hasMany(PaymentProof::class);
    }

    public function latestProof(): HasOne
    {
        return $this->hasOne(PaymentProof::class)->latestOfMany();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
