<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_view_and_update_settings(): void
    {
        $user = $this->signIn(User::factory()->create(['email_notifications' => false]));

        $this->getJson('/api/resident/settings')
            ->assertOk()
            ->assertExactJson(['data' => ['smsNotifications' => true, 'emailNotifications' => false, 'allowChat' => true]]);

        $this->putJson('/api/resident/settings', [
            'smsNotifications' => false,
            'emailNotifications' => true,
            'allowChat' => false,
        ])->assertOk()->assertJsonPath('data.emailNotifications', true);

        $this->assertDatabaseHas('users', [
            'id' => $user->id, 'sms_notifications' => false, 'email_notifications' => true, 'allow_chat' => false,
        ]);
    }

    public function test_all_settings_are_required(): void
    {
        $this->signIn();

        $this->putJson('/api/resident/settings', ['smsNotifications' => 'maybe'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['smsNotifications', 'emailNotifications', 'allowChat']);
    }

    public function test_resident_can_change_password_and_other_devices_are_signed_out(): void
    {
        $user = User::factory()->create();
        $user->createToken('old-phone');
        $this->signIn($user);

        $this->putJson('/api/resident/password', [
            'current_password' => 'password',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ])->assertNoContent();

        $this->assertTrue(Hash::check('new-secret-123', $user->fresh()->password));
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_password_change_needs_the_correct_current_password(): void
    {
        $this->signIn();

        $this->putJson('/api/resident/password', [
            'current_password' => 'wrong',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');
    }

    public function test_new_password_must_be_confirmed_and_long_enough(): void
    {
        $this->signIn();

        $this->putJson('/api/resident/password', [
            'current_password' => 'password',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }
}
