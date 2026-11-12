<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmergencyAlertTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_raise_an_emergency_alert(): void
    {
        $user = $this->signIn();

        $this->postJson('/api/resident/emergency-alerts')
            ->assertCreated()
            ->assertJsonPath('data.status', 'open')
            ->assertJsonStructure(['data' => ['id', 'status', 'emergencyLine']]);

        $this->assertDatabaseHas('emergency_alerts', ['user_id' => $user->id, 'status' => 'open']);
    }
}
