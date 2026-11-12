<?php

namespace Database\Factories;

use App\Models\EstateUpdate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EstateUpdate>
 */
class EstateUpdateFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'author' => 'Estate Admin',
            'body' => fake()->paragraph(),
            'image_path' => null,
            'published_at' => now()->subHour(),
        ];
    }
}
