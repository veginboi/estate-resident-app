<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Plot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_resident_sees_the_estate_chatroom_first(): void
    {
        $this->signIn();

        $this->getJson('/api/resident/conversations')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'estate')
            ->assertJsonPath('data.0.title', 'LincolnEstate Chatroom')
            ->assertJsonPath('data.0.resident', null)
            ->assertJsonPath('data.0.unreadCount', 0);
    }

    public function test_residents_can_post_and_read_in_the_estate_chatroom(): void
    {
        $ada = User::factory()->create(['name' => 'Ada Obi']);
        $room = Conversation::estateRoom();

        $this->signIn($ada);
        $this->postJson("/api/resident/conversations/{$room->id}/messages", ['body' => '  Gate is open again  '])
            ->assertCreated()
            ->assertJsonPath('data.body', 'Gate is open again')
            ->assertJsonPath('data.sender.name', 'Ada Obi')
            ->assertJsonPath('data.mine', true);

        $this->assertDatabaseHas('messages', ['conversation_id' => $room->id, 'user_id' => $ada->id, 'body' => 'Gate is open again']);

        $this->signIn(User::factory()->create());
        $this->getJson("/api/resident/conversations/{$room->id}/messages")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.body', 'Gate is open again')
            ->assertJsonPath('data.0.mine', false)
            ->assertJsonPath('meta.hasMore', false);
    }

    public function test_new_messages_count_as_unread_until_the_chat_is_opened(): void
    {
        $me = $this->signIn();
        $room = Conversation::estateRoom();
        Message::factory()->create(['body' => 'Before I joined']);

        // Joining: older messages don't count as unread.
        $this->getJson('/api/resident/conversations/unread')->assertOk()->assertJsonPath('data.count', 0);

        Message::factory()->count(2)->create();
        Message::factory()->create(['user_id' => $me->id]); // my own message is never unread

        $this->getJson('/api/resident/conversations/unread')->assertJsonPath('data.count', 2);
        $this->getJson('/api/resident/conversations')->assertJsonPath('data.0.unreadCount', 2);

        $this->getJson("/api/resident/conversations/{$room->id}/messages")->assertOk();

        $this->getJson('/api/resident/conversations/unread')->assertJsonPath('data.count', 0);
    }

    public function test_polling_with_after_returns_only_newer_messages(): void
    {
        $this->signIn();
        $room = Conversation::estateRoom();
        $first = Message::factory()->create(['body' => 'one']);
        Message::factory()->create(['body' => 'two']);
        Message::factory()->create(['body' => 'three']);

        $this->getJson("/api/resident/conversations/{$room->id}/messages?after={$first->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.body', 'two')
            ->assertJsonPath('data.1.body', 'three');
    }

    public function test_history_is_paged_with_before(): void
    {
        $this->signIn();
        $room = Conversation::estateRoom();
        $sender = User::factory()->create();
        Message::factory()->count(55)->create(['user_id' => $sender->id]);

        $latest = $this->getJson("/api/resident/conversations/{$room->id}/messages")
            ->assertOk()
            ->assertJsonCount(50, 'data')
            ->assertJsonPath('meta.hasMore', true);

        $oldestShown = $latest->json('data.0.id');
        $this->getJson("/api/resident/conversations/{$room->id}/messages?before={$oldestShown}")
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.hasMore', false);
    }

    public function test_resident_can_start_a_direct_chat_and_the_other_resident_sees_it(): void
    {
        $me = User::factory()->create(['name' => 'Ada Obi']);
        $victor = User::factory()->create(['name' => 'Victor Aguh', 'resident_code' => 'EHN107']);
        $this->signIn($me);

        $id = $this->postJson('/api/resident/conversations', ['residentId' => $victor->id])
            ->assertCreated()
            ->assertJsonPath('data.type', 'direct')
            ->assertJsonPath('data.title', 'Victor Aguh')
            ->assertJsonPath('data.resident.residentCode', 'EHN107')
            ->json('data.id');

        // Opening it again returns the same chat.
        $this->postJson('/api/resident/conversations', ['residentId' => $victor->id])
            ->assertOk()
            ->assertJsonPath('data.id', $id);

        // Empty chats stay out of the list until someone writes.
        $this->getJson('/api/resident/conversations')->assertJsonCount(1, 'data');

        $this->postJson("/api/resident/conversations/{$id}/messages", ['body' => 'Hello neighbour'])->assertCreated();

        $this->signIn($victor);
        $this->getJson('/api/resident/conversations')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.type', 'estate')
            ->assertJsonPath('data.1.title', 'Ada Obi')
            ->assertJsonPath('data.1.lastMessage.body', 'Hello neighbour')
            ->assertJsonPath('data.1.lastMessage.mine', false)
            ->assertJsonPath('data.1.unreadCount', 1);
    }

    public function test_other_residents_cannot_read_or_post_in_a_direct_chat(): void
    {
        $chat = Conversation::between(User::factory()->create(), User::factory()->create());
        Message::factory()->create(['conversation_id' => $chat->id]);

        $this->signIn();

        $this->getJson("/api/resident/conversations/{$chat->id}")->assertNotFound();
        $this->getJson("/api/resident/conversations/{$chat->id}/messages")->assertNotFound();
        $this->postJson("/api/resident/conversations/{$chat->id}/messages", ['body' => 'hi'])->assertNotFound();
        $this->getJson('/api/resident/conversations')->assertJsonCount(1, 'data');
    }

    public function test_residents_who_turned_off_chat_cannot_be_messaged(): void
    {
        $me = $this->signIn();
        $private = User::factory()->create(['name' => 'Bola Ade', 'allow_chat' => false]);

        $this->postJson('/api/resident/conversations', ['residentId' => $private->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['residentId' => "Bola Ade isn't accepting messages."]);

        // An existing chat stops accepting messages once they switch it off.
        $chat = Conversation::between($me, $private);
        $this->postJson("/api/resident/conversations/{$chat->id}/messages", ['body' => 'hi'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');
        $this->assertSame(0, Message::count());
    }

    public function test_cannot_start_a_chat_with_yourself(): void
    {
        $me = $this->signIn();

        $this->postJson('/api/resident/conversations', ['residentId' => $me->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('residentId');
    }

    public function test_message_must_not_be_empty_or_too_long(): void
    {
        $this->signIn();
        $room = Conversation::estateRoom();

        $this->postJson("/api/resident/conversations/{$room->id}/messages", ['body' => '   '])->assertUnprocessable();
        $this->postJson("/api/resident/conversations/{$room->id}/messages", ['body' => str_repeat('a', 2001)])->assertUnprocessable();
        $this->assertSame(0, Message::count());
    }

    public function test_neighbour_list_shows_residents_who_accept_messages_without_contact_details(): void
    {
        $this->signIn();
        $victor = User::factory()->create(['name' => 'Victor Aguh', 'resident_code' => 'EHN107']);
        Plot::factory()->create(['user_id' => $victor->id, 'label' => 'A7']);
        User::factory()->create(['name' => 'Bola Ade']);
        User::factory()->create(['name' => 'Hidden Person', 'allow_chat' => false]);

        $this->getJson('/api/resident/neighbours')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Bola Ade')
            ->assertJsonPath('data.1.name', 'Victor Aguh')
            ->assertJsonPath('data.1.plot', 'A7')
            ->assertJsonMissingPath('data.0.email')
            ->assertJsonMissingPath('data.0.phone');

        $this->getJson('/api/resident/neighbours?q=VICT')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.residentCode', 'EHN107');
    }

    public function test_messages_require_authentication(): void
    {
        $this->getJson('/api/resident/conversations')->assertUnauthorized();
        $this->getJson('/api/resident/neighbours')->assertUnauthorized();
    }
}
