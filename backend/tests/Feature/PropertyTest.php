<?php

namespace Tests\Feature;

use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_register_a_property(): void
    {
        $user = $this->signIn();

        $this->postJson('/api/resident/properties', [
            'type' => 'Car',
            'name' => 'Lexus',
            'number' => 'fct0023jb',
            'colour' => 'Red',
            'details' => 'RX350',
        ])->assertCreated()->assertJsonPath('data.number', 'FCT0023JB');

        $this->assertDatabaseHas('properties', ['user_id' => $user->id, 'number' => 'FCT0023JB']);
    }

    public function test_resident_cannot_register_the_same_number_twice(): void
    {
        $user = $this->signIn();
        Property::factory()->for($user)->create(['number' => 'LHEB001']);

        $this->postJson('/api/resident/properties', [
            'type' => 'House', 'name' => 'Duplicate', 'number' => 'lheb001',
        ])->assertUnprocessable()->assertJsonValidationErrors('number');
    }

    public function test_a_different_resident_can_use_the_same_number(): void
    {
        Property::factory()->create(['number' => 'LHEB001']);
        $this->signIn();

        $this->postJson('/api/resident/properties', [
            'type' => 'House', 'name' => 'Mine', 'number' => 'LHEB001',
        ])->assertCreated();
    }

    public function test_updating_a_property_keeps_its_own_number(): void
    {
        $user = $this->signIn();
        $property = Property::factory()->for($user)->create(['number' => 'LHEB001', 'type' => 'House']);

        $this->putJson("/api/resident/properties/{$property->id}", [
            'type' => 'House', 'name' => 'LE B001-SECTION', 'number' => 'LHEB001', 'colour' => 'Green', 'details' => '8 Bed Room',
        ])->assertOk()->assertJsonPath('data.colour', 'Green');
    }

    public function test_type_must_be_a_known_type(): void
    {
        $this->signIn();

        $this->postJson('/api/resident/properties', ['type' => 'Spaceship', 'name' => 'X', 'number' => '1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('type');
    }

    public function test_resident_can_remove_a_property_but_not_someone_elses(): void
    {
        $user = $this->signIn();
        $mine = Property::factory()->for($user)->create();
        $theirs = Property::factory()->create();

        $this->deleteJson("/api/resident/properties/{$theirs->id}")->assertNotFound();
        $this->deleteJson("/api/resident/properties/{$mine->id}")->assertNoContent();

        $this->assertModelMissing($mine);
        $this->assertModelExists($theirs);
    }
}
