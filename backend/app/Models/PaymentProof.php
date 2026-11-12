<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A bank transfer receipt a resident uploaded for a bill. The file is kept on the
 * private disk and is only served to the resident who uploaded it.
 */
#[Fillable([
    'bill_id', 'user_id', 'amount', 'paid_on', 'transfer_reference',
    'file_path', 'file_name', 'file_mime', 'file_size',
    'status', 'review_note', 'reviewed_at',
])]
class PaymentProof extends Model
{
    use HasFactory;

    public const PENDING = 'pending';

    public const APPROVED = 'approved';

    public const REJECTED = 'rejected';

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_on' => 'date',
            'reviewed_at' => 'datetime',
            'file_size' => 'integer',
        ];
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
