<?php

namespace App\Http\Resources;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
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
            'orderNumber' => $this->orderNumber(),
            'status' => $status,
            'items' => $this->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'productId' => $item->product_id,
                'name' => $item->name,
                'unit' => $item->unit,
                'unitPrice' => (float) $item->unit_price,
                'quantity' => $item->quantity,
                'lineTotal' => (float) $item->line_total,
            ])->values(),
            'total' => (float) $this->total,
            'deliveryMethod' => $this->delivery_method,
            'note' => $this->note,
            'createdAt' => $this->created_at->toIso8601String(),
            'paidAt' => $this->paid_at?->toIso8601String(),
            'canUploadReceipt' => $status === Order::AWAITING_PAYMENT,
            'canCancel' => $status === Order::AWAITING_PAYMENT,
            'receipt' => $proof ? (new PaymentProofResource($proof))->resolve($request) : null,
        ];
    }
}
