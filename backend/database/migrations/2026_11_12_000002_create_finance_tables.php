<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Bills and dues issued to a resident by the estate (written by the admin side).
        // A bill is paid once paid_at is set; the resident app works out the rest of the
        // status (unpaid, overdue, awaiting confirmation) from the due date and receipts.
        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('description', 500)->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('due_date');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'paid_at']);
        });

        // Bank transfer receipts uploaded by residents. The admin side reviews each one:
        // approving it marks the bill paid and records a payment; rejecting it adds a note.
        Schema::create('payment_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bill_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('paid_on');
            $table->string('transfer_reference', 60)->nullable();
            $table->string('file_path');
            $table->string('file_name');
            $table->string('file_mime', 100);
            $table->unsignedInteger('file_size');
            $table->string('status', 20)->default('pending'); // pending, approved, rejected
            $table->string('review_note', 500)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['bill_id', 'status']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('bill_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->string('method', 30)->nullable()->after('amount'); // e.g. bank_transfer
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bill_id');
            $table->dropColumn('method');
        });
        Schema::dropIfExists('payment_proofs');
        Schema::dropIfExists('bills');
    }
};
