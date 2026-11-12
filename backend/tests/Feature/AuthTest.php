<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_can_log_in_and_receives_a_token(): void
    {
        $user = User::factory()->create(['email' => 'resident@example.com']);

        $this->postJson('/api/auth/login', ['email' => 'resident@example.com', 'password' => 'password'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'residentCode', 'name', 'email']])
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_login_fails_with_the_wrong_password(): void
    {
        User::factory()->create(['email' => 'resident@example.com']);

        $this->postJson('/api/auth/login', ['email' => 'resident@example.com', 'password' => 'wrong'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_resident_endpoints_require_authentication(): void
    {
        $this->getJson('/api/resident/profile')->assertUnauthorized();
        $this->getJson('/api/resident/dashboard')->assertUnauthorized();
        $this->getJson('/api/estate/map')->assertUnauthorized();
    }

    public function test_logout_revokes_the_token(): void
    {
        $user = $this->signIn();

        $this->postJson('/api/auth/logout')->assertNoContent();

        $this->assertSame(0, $user->tokens()->count());
    }
}
