<?php

namespace Database\Factories;

use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Property>
 */
class PropertyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => 'Car',
            'name' => fake()->randomElement(['Toyota', 'Lexus', 'Honda', 'Kia']),
            'number' => strtoupper(fake()->unique()->bothify('???###??')),
            'colour' => fake()->safeColorName(),
            'details' => null,
        ];
    }
}
