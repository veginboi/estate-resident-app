<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentProof;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StoreTest extends TestCase
{
    use RefreshDatabase;

    private function receipt(array $overrides = []): array
    {
        return array_merge([
            'receipt' => UploadedFile::fake()->image('transfer.png'),
            'amount' => '12500',
            'paid_on' => today()->toDateString(),
        ], $overrides);
    }

    public function test_products_list_shows_active_products_with_categories(): void
    {
        $this->signIn();
        Product::factory()->create(['name' => 'Car sticker', 'category' => 'Access & Security', 'price' => 5000, 'sort_order' => 1]);
        Product::factory()->create(['name' => 'Gas refill', 'category' => 'Home', 'price' => 18000, 'unit' => '12.5 kg', 'stock' => 0, 'sort_order' => 2]);
        Product::factory()->create(['name' => 'Waste bin', 'category' => 'Home', 'stock' => 4, 'max_per_order' => 2, 'sort_order' => 3]);
        Product::factory()->create(['name' => 'Old item', 'category' => 'Retired', 'is_active' => false]);

        $this->getJson('/api/resident/store/products')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.name', 'Car sticker')
            ->assertJsonPath('data.0.inStock', true)
            ->assertJsonPath('data.0.maxQuantity', null)
            ->assertJsonPath('data.1.unit', '12.5 kg')
            ->assertJsonPath('data.1.inStock', false)
            ->assertJsonPath('data.2.maxQuantity', 2)
            ->assertJsonPath('meta.categories', ['Access & Security', 'Home']);

        $this->getJson('/api/resident/store/products?category=Home')->assertJsonCount(2, 'data');
        $this->getJson('/api/resident/store/products?q=STICK')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Car sticker');
    }

    public function test_resident_can_place_an_order_priced_by_the_server(): void
    {
        $user = $this->signIn();
        $sticker = Product::factory()->create(['name' => 'Car sticker', 'price' => 5000, 'unit' => 'per car']);
        $water = Product::factory()->create(['name' => 'Table water', 'price' => 600.5, 'stock' => 10]);

        $response = $this->postJson('/api/resident/store/orders', [
            'items' => [
                ['productId' => $sticker->id, 'quantity' => 2],
                ['productId' => $water->id, 'quantity' => 3],
                // a price sent by the app is ignored
            ],
            'deliveryMethod' => 'delivery',
            'note' => '  Leave at the gate  ',
            'total' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'awaiting_payment')
            ->assertJsonPath('data.total', 11801.5)
            ->assertJsonPath('data.deliveryMethod', 'delivery')
            ->assertJsonPath('data.note', 'Leave at the gate')
            ->assertJsonPath('data.items.0.name', 'Car sticker')
            ->assertJsonPath('data.items.0.unit', 'per car')
            ->assertJsonPath('data.items.0.lineTotal', 10000)
            ->assertJsonPath('data.items.1.lineTotal', 1801.5)
            ->assertJsonPath('data.canUploadReceipt', true)
            ->assertJsonPath('data.canCancel', true);

        $order = Order::sole();
        $this->assertSame($user->id, $order->user_id);
        $this->assertSame('ORD-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT), $response->json('data.orderNumber'));
        $this->assertSame(7, $water->fresh()->stock);

        // Later price changes don't change the order.
        $sticker->update(['price' => 9999]);
        $this->getJson("/api/resident/store/orders/{$order->id}")->assertJsonPath('data.items.0.unitPrice', 5000);
    }

    public function test_order_is_rejected_when_stock_or_limits_are_exceeded(): void
    {
        $this->signIn();
        $bin = Product::factory()->create(['name' => 'Waste bin', 'stock' => 3, 'max_per_order' => 2]);
        $gas = Product::factory()->create(['name' => 'Gas refill', 'stock' => 0]);
        $retired = Product::factory()->create(['is_active' => false]);

        $this->postJson('/api/resident/store/orders', ['items' => [['productId' => $bin->id, 'quantity' => 3]], 'deliveryMethod' => 'pickup'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => 'at most 2 of Waste bin']);
        $this->postJson('/api/resident/store/orders', ['items' => [['productId' => $gas->id, 'quantity' => 1]], 'deliveryMethod' => 'pickup'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => 'Gas refill is out of stock']);
        $this->postJson('/api/resident/store/orders', ['items' => [['productId' => $retired->id, 'quantity' => 1]], 'deliveryMethod' => 'pickup'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => 'no longer for sale']);
        $this->postJson('/api/resident/store/orders', ['items' => [], 'deliveryMethod' => 'pickup'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items' => 'Your cart is empty']);
        $this->postJson('/api/resident/store/orders', ['items' => [['productId' => $bin->id, 'quantity' => 1]], 'deliveryMethod' => 'drone'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('deliveryMethod');

        $this->assertSame(0, Order::count());
        $this->assertSame(3, $bin->fresh()->stock);
    }

    public function test_resident_can_cancel_an_unpaid_order_and_stock_comes_back(): void
    {
        $this->signIn();
        $bin = Product::factory()->create(['stock' => 4]);
        $id = $this->postJson('/api/resident/store/orders', ['items' => [['productId' => $bin->id, 'quantity' => 2]], 'deliveryMethod' => 'pickup'])->json('data.id');
        $this->assertSame(2, $bin->fresh()->stock);

        $this->postJson("/api/resident/store/orders/{$id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.canCancel', false)
            ->assertJsonPath('data.canUploadReceipt', false);

        $this->assertSame(4, $bin->fresh()->stock);
        $this->postJson("/api/resident/store/orders/{$id}/cancel")->assertUnprocessable();
    }

    public function test_resident_uploads_a_receipt_and_can_no_longer_cancel(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $order = Order::factory()->for($user)->create(['total' => 12500]);

        $this->post("/api/resident/store/orders/{$order->id}/receipts", $this->receipt(), ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'payment_submitted')
            ->assertJsonPath('data.canCancel', false)
            ->assertJsonPath('data.canUploadReceipt', false)
            ->assertJsonPath('data.receipt.status', 'pending')
            ->assertJsonPath('data.receipt.fileName', 'transfer.png');

        $proof = PaymentProof::sole();
        $this->assertSame($order->id, $proof->order_id);
        $this->assertNull($proof->bill_id);
        Storage::disk('local')->assertExists($proof->file_path);

        $this->postJson("/api/resident/store/orders/{$order->id}/cancel")->assertUnprocessable()->assertJsonValidationErrors('order');
        $this->post("/api/resident/store/orders/{$order->id}/receipts", $this->receipt(), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['receipt' => 'already waiting']);

        // The uploaded receipt can be opened from the order.
        $this->get("/api/resident/receipts/{$proof->id}/file")->assertOk();
    }

    public function test_order_status_follows_payment_and_fulfilment(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $rejected = Order::factory()->for($user)->create();
        PaymentProof::factory()->create(['bill_id' => null, 'order_id' => $rejected->id, 'user_id' => $user->id, 'status' => 'rejected', 'review_note' => 'Wrong amount']);
        Order::factory()->for($user)->create(['paid_at' => now()]);
        Order::factory()->for($user)->create(['paid_at' => now(), 'fulfilment' => 'ready']);
        Order::factory()->for($user)->create(['paid_at' => now(), 'fulfilment' => 'completed']);
        Order::factory()->create(); // someone else's

        $this->getJson('/api/resident/store/orders')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0.status', 'completed')
            ->assertJsonPath('data.1.status', 'ready')
            ->assertJsonPath('data.2.status', 'processing')
            ->assertJsonPath('data.3.status', 'awaiting_payment')
            ->assertJsonPath('data.3.receipt.reviewNote', 'Wrong amount')
            ->assertJsonPath('data.3.canUploadReceipt', true);

        $this->post("/api/resident/store/orders/{$rejected->id}/receipts", $this->receipt(), ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'payment_submitted');
    }

    public function test_residents_cannot_see_or_change_other_residents_orders(): void
    {
        Storage::fake('local');
        $this->signIn();
        $theirs = Order::factory()->for(User::factory())->create();

        $this->getJson("/api/resident/store/orders/{$theirs->id}")->assertNotFound();
        $this->postJson("/api/resident/store/orders/{$theirs->id}/cancel")->assertNotFound();
        $this->post("/api/resident/store/orders/{$theirs->id}/receipts", $this->receipt(), ['Accept' => 'application/json'])->assertNotFound();
    }

    public function test_store_requires_authentication(): void
    {
        $this->getJson('/api/resident/store/products')->assertUnauthorized();
        $this->postJson('/api/resident/store/orders')->assertUnauthorized();
    }
}
