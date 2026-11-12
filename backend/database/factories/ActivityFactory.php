<?php

namespace Database\Factories;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Activity>
 */
class ActivityFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->name(),
            'date' => today()->toDateString(),
            'out_at' => '08:30',
            'out_with' => 'Alone',
            'in_at' => '18:45',
            'in_with' => 'Alone',
        ];
    }
}
