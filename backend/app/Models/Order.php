<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * A resident's order from the estate shop.
 */
#[Fillable(['user_id', 'total', 'delivery_method', 'note', 'fulfilment', 'paid_at', 'cancelled_at'])]
class Order extends Model
{
    use HasFactory;

    // Fulfilment, set by the admin side (and "cancelled" by the resident before paying).
    public const OPEN = 'open';

    public const READY = 'ready';

    public const COMPLETED = 'completed';

    public const CANCELLED = 'cancelled';

    // The status residents see.
    public const AWAITING_PAYMENT = 'awaiting_payment';

    public const PAYMENT_SUBMITTED = 'payment_submitted';

    public const PROCESSING = 'processing';

    public const PICKUP = 'pickup';

    public const DELIVERY = 'delivery';

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'paid_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    /**
     * awaiting_payment, payment_submitted, processing, ready, completed or cancelled.
     */
    public function status(): string
    {
        return match (true) {
            $this->fulfilment === self::CANCELLED => self::CANCELLED,
            $this->fulfilment === self::COMPLETED => self::COMPLETED,
            $this->paid_at !== null && $this->fulfilment === self::READY => self::READY,
            $this->paid_at !== null => self::PROCESSING,
            $this->latestProof?->status === PaymentProof::PENDING => self::PAYMENT_SUBMITTED,
            default => self::AWAITING_PAYMENT,
        };
    }

    public function orderNumber(): string
    {
        return 'ORD-'.str_pad((string) $this->id, 6, '0', STR_PAD_LEFT);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function proofs(): HasMany
    {
        return $this->hasMany(PaymentProof::class);
    }

    public function latestProof(): HasOne
    {
        return $this->hasOne(PaymentProof::class)->latestOfMany();
    }
}
