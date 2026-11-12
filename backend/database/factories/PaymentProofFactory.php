<?php

namespace Database\Factories;

use App\Models\Bill;
use App\Models\PaymentProof;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PaymentProof>
 */
class PaymentProofFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'bill_id' => Bill::factory(),
            'user_id' => fn (array $attributes) => Bill::find($attributes['bill_id'])->user_id,
            'amount' => 10000,
            'paid_on' => today()->toDateString(),
            'transfer_reference' => 'TRF'.fake()->numerify('########'),
            'file_path' => 'payment-proofs/test/receipt.jpg',
            'file_name' => 'receipt.jpg',
            'file_mime' => 'image/jpeg',
            'file_size' => 1024,
            'status' => PaymentProof::PENDING,
        ];
    }

    public function rejected(string $note = 'The amount does not match the bill.'): static
    {
        return $this->state(fn () => ['status' => PaymentProof::REJECTED, 'review_note' => $note, 'reviewed_at' => now()]);
    }
}
