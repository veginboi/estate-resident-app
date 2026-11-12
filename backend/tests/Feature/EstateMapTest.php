<?php

namespace Tests\Feature;

use App\Models\Plot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EstateMapTest extends TestCase
{
    use RefreshDatabase;

    public function test_map_returns_roads_and_plots_with_the_residents_home_marked(): void
    {
        $user = $this->signIn();
        $neighbour = User::factory()->create(['name' => 'Mr. Esele Andrew']);

        Plot::factory()->create(['code' => 'B1', 'label' => 'B1', 'user_id' => $user->id]);
        Plot::factory()->create(['code' => 'A2', 'label' => 'A2', 'user_id' => $neighbour->id]);
        Plot::factory()->create(['code' => 'PARK', 'label' => 'Park', 'kind' => 'green']);

        $this->getJson('/api/estate/map')
            ->assertOk()
            ->assertJsonPath('data.width', 1000)
            ->assertJsonCount(2, 'data.roads')
            ->assertJsonCount(3, 'data.plots')
            ->assertJsonPath('data.plots.0.id', 'B1')
            ->assertJsonPath('data.plots.0.isMine', true)
            ->assertJsonPath('data.plots.1.owner', 'Mr. Esele Andrew')
            ->assertJsonPath('data.plots.1.isMine', false)
            ->assertJsonPath('data.plots.2.owner', null);
    }
}
