<?php

namespace Database\Factories;

use App\Models\EmergencyAlert;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EmergencyAlert>
 */
class EmergencyAlertFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'status' => 'open',
            'note' => null,
        ];
    }
}
