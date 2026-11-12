<?php

namespace Database\Factories;

use App\Models\Plot;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Plot>
 */
class PlotFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $code = strtoupper(fake()->unique()->bothify('?##'));

        return [
            'code' => $code,
            'label' => $code,
            'kind' => 'residential',
            'x' => 0,
            'y' => 0,
            'w' => 100,
            'h' => 100,
            'user_id' => null,
            'description' => null,
        ];
    }
}
