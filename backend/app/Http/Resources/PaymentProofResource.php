<?php

namespace App\Http\Resources;

use App\Models\PaymentProof;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A transfer receipt the resident uploaded, as shown on a bill or an order.
 *
 * @mixin PaymentProof
 */
class PaymentProofResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'amount' => (float) $this->amount,
            'paidOn' => $this->paid_on->toDateString(),
            'transferReference' => $this->transfer_reference,
            'fileName' => $this->file_name,
            'submittedAt' => $this->created_at->toIso8601String(),
            'reviewNote' => $this->review_note,
        ];
    }
}
