<?php

namespace Tests\Feature;

use App\Models\FamilyMember;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyMemberTest extends TestCase
{
    use RefreshDatabase;

    public function test_resident_only_sees_their_own_family_members(): void
    {
        $user = $this->signIn();
        FamilyMember::factory()->for($user)->create(['name' => 'Grace']);
        FamilyMember::factory()->create(['name' => 'Stranger']);

        $this->getJson('/api/resident/family-members')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Grace');
    }

    public function test_resident_can_add_a_family_member(): void
    {
        $user = $this->signIn();

        $this->postJson('/api/resident/family-members', [
            'name' => '  Daniel Onyemenam ',
            'role' => 'Child',
            'age' => 8,
            'gender' => 'Male',
        ])->assertCreated()->assertJsonPath('data.name', 'Daniel Onyemenam');

        $this->assertDatabaseHas('family_members', ['user_id' => $user->id, 'name' => 'Daniel Onyemenam', 'age' => 8]);
    }

    public function test_family_member_input_is_validated(): void
    {
        $this->signIn();

        $this->postJson('/api/resident/family-members', [
            'name' => '',
            'role' => 'Boss',
            'age' => 150,
            'gender' => 'Other',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'role', 'age', 'gender']);
    }

    public function test_resident_can_update_and_remove_a_family_member(): void
    {
        $user = $this->signIn();
        $member = FamilyMember::factory()->for($user)->create();

        $this->putJson("/api/resident/family-members/{$member->id}", [
            'name' => 'Grace Onyemenam',
            'role' => 'Wife',
            'age' => 34,
            'gender' => 'Female',
        ])->assertOk()->assertJsonPath('data.role', 'Wife');

        $this->deleteJson("/api/resident/family-members/{$member->id}")->assertNoContent();
        $this->assertModelMissing($member);
    }

    public function test_resident_cannot_touch_another_households_members(): void
    {
        $this->signIn();
        $member = FamilyMember::factory()->create();

        $this->putJson("/api/resident/family-members/{$member->id}", [
            'name' => 'Changed', 'role' => 'Wife', 'age' => 30, 'gender' => 'Female',
        ])->assertNotFound();
        $this->deleteJson("/api/resident/family-members/{$member->id}")->assertNotFound();

        $this->assertModelExists($member);
    }
}
