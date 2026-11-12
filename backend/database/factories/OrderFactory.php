<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'total' => 5000,
            'delivery_method' => Order::PICKUP,
            'note' => null,
            'fulfilment' => Order::OPEN,
            'paid_at' => null,
        ];
    }
}
