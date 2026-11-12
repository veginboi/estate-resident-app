<?php

namespace Database\Factories;

use App\Models\Bill;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Bill>
 */
class BillFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => 'Service charge',
            'description' => null,
            'amount' => 10000,
            'due_date' => today()->addDays(10)->toDateString(),
            'paid_at' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn () => ['paid_at' => now()->subDay()]);
    }

    public function overdue(): static
    {
        return $this->state(fn () => ['due_date' => today()->subDays(5)->toDateString()]);
    }
}
