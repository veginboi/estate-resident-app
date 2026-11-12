<?php

namespace Tests\Feature;

use App\Models\Activity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_sees_their_households_activity_newest_first(): void
    {
        $user = $this->signIn();
        Activity::factory()->for($user)->create(['date' => '2026-11-10', 'name' => 'Older']);
        Activity::factory()->for($user)->create(['date' => '2026-11-11', 'name' => 'Newer', 'in_at' => null, 'in_with' => null]);
        Activity::factory()->create(['name' => 'Another household']);

        $this->getJson('/api/resident/activities')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Newer')
            ->assertJsonPath('data.0.date', '2026-11-11')
            ->assertJsonPath('data.0.outAt', '08:30')
            ->assertJsonPath('data.0.inAt', null);
    }

    public function test_activity_can_be_filtered_by_date(): void
    {
        $user = $this->signIn();
        Activity::factory()->for($user)->create(['date' => '2026-11-10']);
        Activity::factory()->for($user)->create(['date' => '2026-11-11']);

        $this->getJson('/api/resident/activities?date=2026-11-10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.date', '2026-11-10');
    }

    public function test_date_filter_must_be_a_valid_date(): void
    {
        $this->signIn();

        $this->getJson('/api/resident/activities?date=yesterday')->assertUnprocessable();
    }
}
