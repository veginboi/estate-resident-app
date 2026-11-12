<?php

namespace Database\Factories;

use App\Models\FamilyMember;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FamilyMember>
 */
class FamilyMemberFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->name(),
            'role' => fake()->randomElement(['Wife', 'Child', 'Relative']),
            'age' => fake()->numberBetween(1, 80),
            'gender' => fake()->randomElement(['Male', 'Female']),
        ];
    }
}
