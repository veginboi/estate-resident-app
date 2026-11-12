<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\UploadedFile;

/**
 * A bank transfer receipt a resident uploaded for a bill or a store order. The file is kept on the
 * private disk and is only served to the resident who uploaded it.
 */
#[Fillable([
    'bill_id', 'order_id', 'user_id', 'amount', 'paid_on', 'transfer_reference',
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

    /**
     * Saves an uploaded receipt on the private disk and records it as pending.
     *
     * @param  array{amount: numeric-string|float|int, paid_on: string, transfer_reference?: string|null}  $data
     * @param  array{bill_id?: int, order_id?: int}  $for
     */
    public static function fromUpload(UploadedFile $file, User $user, array $data, array $for): self
    {
        $path = $file->store("payment-proofs/{$user->id}", 'local');
        $reference = trim((string) ($data['transfer_reference'] ?? ''));

        return static::create([
            ...$for,
            'user_id' => $user->id,
            'amount' => $data['amount'],
            'paid_on' => $data['paid_on'],
            'transfer_reference' => $reference !== '' ? $reference : null,
            'file_path' => $path,
            'file_name' => mb_substr($file->getClientOriginalName() ?: 'receipt', 0, 255),
            'file_mime' => $file->getMimeType() ?? 'application/octet-stream',
            'file_size' => $file->getSize(),
            'status' => self::PENDING,
        ]);
    }

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
