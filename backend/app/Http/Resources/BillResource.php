<?php

namespace App\Http\Resources;

use App\Models\Bill;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Bill
 */
class BillResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $status = $this->status();
        $proof = $this->latestProof;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'dueDate' => $this->due_date->toDateString(),
            'status' => $status,
            'paidAt' => $this->paid_at?->toIso8601String(),
            'canUploadReceipt' => in_array($status, [Bill::UNPAID, Bill::OVERDUE], true),
            'receipt' => $proof ? [
                'id' => $proof->id,
                'status' => $proof->status,
                'amount' => (float) $proof->amount,
                'paidOn' => $proof->paid_on->toDateString(),
                'transferReference' => $proof->transfer_reference,
                'fileName' => $proof->file_name,
                'submittedAt' => $proof->created_at->toIso8601String(),
                'reviewNote' => $proof->review_note,
            ] : null,
        ];
    }
}
