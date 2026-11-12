<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ada Obi',
            'email' => 'Ada@Example.com ',
            'phone' => '+234 803 000 0000',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
        ], $overrides);
    }

    public function test_new_resident_can_sign_up_and_is_stored(): void
    {
        $response = $this->postJson('/api/auth/register', $this->payload())
            ->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'residentCode', 'name', 'email']])
            ->assertJsonPath('user.email', 'ada@example.com');

        $user = User::firstWhere('email', 'ada@example.com');
        $this->assertNotNull($user);
        $this->assertSame('Ada Obi', $user->name);
        $this->assertSame('+234 803 000 0000', $user->phone);
        $this->assertMatchesRegularExpression('/^LE[A-Z0-9]{6}$/', $user->resident_code);
        $this->assertNotSame('secret-pass', $user->password);

        // The returned token works straight away.
        $this->withToken($response->json('token'))
            ->getJson('/api/resident/profile')
            ->assertOk()
            ->assertJsonPath('data.name', 'Ada Obi');
    }

    public function test_new_resident_can_sign_in_with_the_same_details(): void
    {
        $this->postJson('/api/auth/register', $this->payload())->assertCreated();

        $this->postJson('/api/auth/login', ['email' => 'ADA@example.com', 'password' => 'secret-pass'])
            ->assertOk()
            ->assertJsonStructure(['token']);
    }

    public function test_a_new_resident_with_no_data_yet_can_use_every_screen(): void
    {
        $token = $this->postJson('/api/auth/register', $this->payload())->json('token');
        $this->withToken($token);

        $this->getJson('/api/resident/dashboard')->assertOk()->assertJsonPath('data.stats.totalPayments', 0);
        $this->getJson('/api/resident/family-members')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/resident/properties')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/resident/activities')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/resident/settings')->assertOk();
        $this->getJson('/api/estate/map')->assertOk();

        $this->postJson('/api/resident/family-members', ['name' => 'Chidi Obi', 'role' => 'Child', 'age' => 9, 'gender' => 'Male'])
            ->assertCreated();
        $this->assertDatabaseHas('family_members', ['name' => 'Chidi Obi']);
    }

    public function test_cannot_sign_up_with_an_email_that_is_already_registered(): void
    {
        User::factory()->create(['email' => 'ada@example.com']);

        $this->postJson('/api/auth/register', $this->payload())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'already exists']);

        $this->assertSame(1, User::count());
    }

    public function test_sign_up_validates_the_details(): void
    {
        $this->postJson('/api/auth/register', $this->payload([
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);

        $this->assertSame(0, User::count());
    }
}
