<?php

namespace App\Http\Resources;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Payment
 */
class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'receiptNumber' => $this->receiptNumber(),
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'method' => $this->method,
            'paidAt' => $this->paid_at->toIso8601String(),
            'bill' => $this->bill ? ['id' => $this->bill->id, 'title' => $this->bill->title] : null,
        ];
    }
}
