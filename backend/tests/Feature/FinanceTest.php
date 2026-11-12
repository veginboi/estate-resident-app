<?php

namespace Tests\Feature;

use App\Models\Bill;
use App\Models\Payment;
use App\Models\PaymentProof;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FinanceTest extends TestCase
{
    use RefreshDatabase;

    private function receiptPayload(array $overrides = []): array
    {
        return array_merge([
            'receipt' => UploadedFile::fake()->image('transfer.jpg'),
            'amount' => '10000',
            'paid_on' => today()->toDateString(),
            'transfer_reference' => ' TRF12345 ',
        ], $overrides);
    }

    public function test_summary_totals_open_bills_and_payments(): void
    {
        config(['estate.bank' => ['name' => 'Zenith Bank', 'account_name' => 'LincolnEstate RA', 'account_number' => '1012345678']]);
        $user = $this->signIn();
        Bill::factory()->for($user)->create(['amount' => 10000]);
        Bill::factory()->for($user)->overdue()->create(['amount' => 15000]);
        $pending = Bill::factory()->for($user)->create(['amount' => 3500]);
        PaymentProof::factory()->for($pending)->create(['user_id' => $user->id]);
        Bill::factory()->for($user)->paid()->create(['amount' => 99999]);
        Bill::factory()->create(['amount' => 50000]); // someone else's
        Payment::factory()->for($user)->create(['amount' => 10000, 'paid_at' => now()]);
        Payment::factory()->for($user)->create(['amount' => 7000, 'paid_at' => now()->subYears(2)]);

        $this->getJson('/api/resident/finance')
            ->assertOk()
            ->assertJsonPath('data.outstanding', 28500)
            ->assertJsonPath('data.openBills', 3)
            ->assertJsonPath('data.overdueBills', 1)
            ->assertJsonPath('data.awaitingConfirmation', 1)
            ->assertJsonPath('data.paidThisYear', 10000)
            ->assertJsonPath('data.totalPaid', 17000)
            ->assertJsonPath('data.bank.accountNumber', '1012345678');
    }

    public function test_bank_details_are_hidden_until_configured(): void
    {
        config(['estate.bank' => ['name' => '', 'account_name' => '', 'account_number' => '']]);
        $this->signIn();

        $this->getJson('/api/resident/finance')->assertOk()->assertJsonPath('data.bank', null);
    }

    public function test_bills_list_shows_each_status_with_open_bills_first(): void
    {
        $user = $this->signIn();
        Bill::factory()->for($user)->paid()->create(['title' => 'October service charge', 'due_date' => today()->subMonth()]);
        Bill::factory()->for($user)->create(['title' => 'Road levy', 'due_date' => today()->addDays(20)]);
        Bill::factory()->for($user)->overdue()->create(['title' => 'Security levy']);
        $waste = Bill::factory()->for($user)->create(['title' => 'Waste collection', 'due_date' => today()->addDays(5)]);
        PaymentProof::factory()->for($waste)->create(['user_id' => $user->id]);
        Bill::factory()->create(['title' => 'Not mine']);

        $this->getJson('/api/resident/bills')
            ->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0.title', 'Security levy')
            ->assertJsonPath('data.0.status', 'overdue')
            ->assertJsonPath('data.0.canUploadReceipt', true)
            ->assertJsonPath('data.1.title', 'Waste collection')
            ->assertJsonPath('data.1.status', 'pending')
            ->assertJsonPath('data.1.canUploadReceipt', false)
            ->assertJsonPath('data.1.receipt.status', 'pending')
            ->assertJsonPath('data.2.title', 'Road levy')
            ->assertJsonPath('data.2.status', 'unpaid')
            ->assertJsonPath('data.3.title', 'October service charge')
            ->assertJsonPath('data.3.status', 'paid');

        $this->getJson('/api/resident/bills?status=open')->assertOk()->assertJsonCount(3, 'data');
        $this->getJson('/api/resident/bills?status=paid')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/resident/bills?status=nonsense')->assertUnprocessable();
    }

    public function test_resident_can_upload_a_transfer_receipt(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $bill = Bill::factory()->for($user)->create();

        $this->post("/api/resident/bills/{$bill->id}/receipts", $this->receiptPayload(), ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.canUploadReceipt', false)
            ->assertJsonPath('data.receipt.status', 'pending')
            ->assertJsonPath('data.receipt.transferReference', 'TRF12345')
            ->assertJsonPath('data.receipt.fileName', 'transfer.jpg');

        $proof = PaymentProof::sole();
        $this->assertSame($user->id, $proof->user_id);
        $this->assertSame('10000.00', $proof->amount);
        Storage::disk('local')->assertExists($proof->file_path);
        $this->assertStringStartsWith("payment-proofs/{$user->id}/", $proof->file_path);
    }

    public function test_receipt_can_be_downloaded_only_by_its_owner(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $bill = Bill::factory()->for($user)->create();
        $this->post("/api/resident/bills/{$bill->id}/receipts", $this->receiptPayload(), ['Accept' => 'application/json'])->assertCreated();
        $proof = PaymentProof::sole();

        $this->get("/api/resident/receipts/{$proof->id}/file")->assertOk()->assertDownload('transfer.jpg');

        $this->signIn(User::factory()->create());
        $this->getJson("/api/resident/receipts/{$proof->id}/file")->assertNotFound();
    }

    public function test_cannot_upload_a_second_receipt_while_one_is_pending_or_once_paid(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $pending = Bill::factory()->for($user)->create();
        PaymentProof::factory()->for($pending)->create(['user_id' => $user->id]);
        $paid = Bill::factory()->for($user)->paid()->create();

        $this->post("/api/resident/bills/{$pending->id}/receipts", $this->receiptPayload(), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['receipt' => 'already waiting']);
        $this->post("/api/resident/bills/{$paid->id}/receipts", $this->receiptPayload(), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['receipt' => 'already been paid']);

        $this->assertSame(1, PaymentProof::count());
    }

    public function test_resident_can_upload_again_after_a_receipt_is_rejected(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $bill = Bill::factory()->for($user)->create();
        PaymentProof::factory()->for($bill)->rejected('Wrong amount')->create(['user_id' => $user->id]);

        $this->getJson("/api/resident/bills/{$bill->id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'unpaid')
            ->assertJsonPath('data.canUploadReceipt', true)
            ->assertJsonPath('data.receipt.status', 'rejected')
            ->assertJsonPath('data.receipt.reviewNote', 'Wrong amount');

        $this->post("/api/resident/bills/{$bill->id}/receipts", $this->receiptPayload(), ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_receipt_upload_is_validated(): void
    {
        Storage::fake('local');
        $user = $this->signIn();
        $bill = Bill::factory()->for($user)->create();

        $this->post("/api/resident/bills/{$bill->id}/receipts", $this->receiptPayload([
            'receipt' => UploadedFile::fake()->create('notes.exe', 10, 'application/octet-stream'),
            'amount' => '0',
            'paid_on' => today()->addDay()->toDateString(),
        ]), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['receipt', 'amount', 'paid_on']);

        $this->post("/api/resident/bills/{$bill->id}/receipts", $this->receiptPayload([
            'receipt' => UploadedFile::fake()->create('huge.pdf', 6000, 'application/pdf'),
        ]), ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['receipt' => 'smaller than 5 MB']);

        $this->assertSame(0, PaymentProof::count());
    }

    public function test_residents_cannot_see_or_pay_other_residents_bills(): void
    {
        Storage::fake('local');
        $this->signIn();
        $theirs = Bill::factory()->create();

        $this->getJson("/api/resident/bills/{$theirs->id}")->assertNotFound();
        $this->post("/api/resident/bills/{$theirs->id}/receipts", $this->receiptPayload(), ['Accept' => 'application/json'])->assertNotFound();
    }

    public function test_payment_history_lists_payments_with_receipt_numbers(): void
    {
        $user = $this->signIn();
        $bill = Bill::factory()->for($user)->paid()->create(['title' => 'November service charge']);
        $older = Payment::factory()->for($user)->create(['description' => 'Gate pass', 'amount' => 2000, 'paid_at' => now()->subMonth()]);
        $newer = Payment::factory()->for($user)->create([
            'bill_id' => $bill->id,
            'description' => 'November service charge',
            'amount' => 10000,
            'method' => 'bank_transfer',
            'paid_at' => now()->subDay(),
        ]);
        Payment::factory()->create(); // someone else's

        $this->getJson('/api/resident/payments')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $newer->id)
            ->assertJsonPath('data.0.receiptNumber', 'LE-'.str_pad((string) $newer->id, 6, '0', STR_PAD_LEFT))
            ->assertJsonPath('data.0.amount', 10000)
            ->assertJsonPath('data.0.method', 'bank_transfer')
            ->assertJsonPath('data.0.bill.title', 'November service charge')
            ->assertJsonPath('data.1.id', $older->id)
            ->assertJsonPath('data.1.bill', null);
    }

    public function test_finance_requires_authentication(): void
    {
        $this->getJson('/api/resident/finance')->assertUnauthorized();
        $this->getJson('/api/resident/bills')->assertUnauthorized();
        $this->getJson('/api/resident/payments')->assertUnauthorized();
    }
}
