<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A payment made by a resident (service charge, dues, etc.).
 */
#[Fillable(['user_id', 'bill_id', 'order_id', 'description', 'amount', 'method', 'paid_at'])]
class Payment extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * The receipt number shown to residents, e.g. "LE-000042".
     */
    public function receiptNumber(): string
    {
        return 'LE-'.str_pad((string) $this->id, 6, '0', STR_PAD_LEFT);
    }
}
