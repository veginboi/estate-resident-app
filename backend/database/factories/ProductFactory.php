<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => ucfirst(fake()->unique()->words(2, true)),
            'description' => fake()->sentence(),
            'category' => 'Access & Security',
            'price' => 5000,
            'unit' => null,
            'image_path' => null,
            'stock' => null,
            'max_per_order' => null,
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
