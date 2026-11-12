<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\EstateUpdate;
use App\Models\Payment;
use App\Models\Plot;
use App\Models\Reminder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_returns_stats_reminders_and_updates(): void
    {
        $user = $this->signIn();

        Plot::factory()->create(['user_id' => $user->id]);
        Plot::factory()->count(3)->create(['user_id' => fn () => User::factory()]);
        Plot::factory()->create(); // empty plot, not a neighbour

        Payment::factory()->for($user)->create(['amount' => 12500]);
        Payment::factory()->for($user)->create(['amount' => 7500]);
        Payment::factory()->create(['amount' => 99999]); // someone else's

        Activity::factory()->for($user)->count(2)->create(['date' => today()->toDateString()]);
        Activity::factory()->for($user)->create(['date' => today()->subDay()->toDateString()]);

        Reminder::factory()->for($user)->create(['text' => 'Pay service charge']);
        Reminder::factory()->create(['text' => 'Not mine']);

        EstateUpdate::factory()->create(['body' => 'Gate closes at 11pm']);
        EstateUpdate::factory()->create(['body' => 'Scheduled', 'published_at' => now()->addDay()]);

        $this->getJson('/api/resident/dashboard')
            ->assertOk()
            ->assertJsonPath('data.stats.neighbors', 3)
            ->assertJsonPath('data.stats.totalPayments', 20000)
            ->assertJsonPath('data.stats.familyActivities', 2)
            ->assertJsonCount(1, 'data.reminders')
            ->assertJsonPath('data.reminders.0.text', 'Pay service charge')
            ->assertJsonPath('data.reminders.0.time', '09:30')
            ->assertJsonPath('data.reminders.0.done', false)
            ->assertJsonCount(1, 'data.updates')
            ->assertJsonPath('data.updates.0.body', 'Gate closes at 11pm');
    }

    public function test_resident_can_mark_a_reminder_as_done(): void
    {
        $user = $this->signIn();
        $reminder = Reminder::factory()->for($user)->create();

        $this->patchJson("/api/resident/reminders/{$reminder->id}", ['done' => true])
            ->assertOk()
            ->assertJsonPath('data.done', true);

        $this->assertNotNull($reminder->fresh()->done_at);
    }

    public function test_resident_cannot_update_someone_elses_reminder(): void
    {
        $this->signIn();
        $reminder = Reminder::factory()->create();

        $this->patchJson("/api/resident/reminders/{$reminder->id}", ['done' => true])->assertNotFound();
    }
}
