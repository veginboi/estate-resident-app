<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_view_their_profile(): void
    {
        $user = $this->signIn(User::factory()->create([
            'resident_code' => 'LEHN123B',
            'name' => 'David Onyemenam',
        ]));

        $this->getJson('/api/resident/profile')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.residentCode', 'LEHN123B')
            ->assertJsonPath('data.name', 'David Onyemenam')
            ->assertJsonMissingPath('data.password');
    }

    public function test_resident_can_update_name_phone_and_about(): void
    {
        $user = $this->signIn();

        $this->putJson('/api/resident/profile', [
            'name' => 'New Name',
            'phone' => '+234 800 000 0000',
            'about' => 'Hello neighbours',
        ])->assertOk()->assertJsonPath('data.about', 'Hello neighbours');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'New Name', 'about' => 'Hello neighbours']);
    }

    public function test_name_cannot_be_blank_and_about_has_a_limit(): void
    {
        $this->signIn();

        $this->putJson('/api/resident/profile', ['name' => '', 'about' => str_repeat('a', 1001)])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'about']);
    }

    public function test_resident_code_and_email_cannot_be_changed_here(): void
    {
        $user = $this->signIn();
        $original = $user->only('resident_code', 'email');

        $this->putJson('/api/resident/profile', ['resident_code' => 'HACKED', 'email' => 'new@example.com'])->assertOk();

        $this->assertSame($original, $user->fresh()->only('resident_code', 'email'));
    }
}
