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
        // Items the estate sells to residents (written by the admin side).
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('description', 1000)->nullable();
            $table->string('category', 40);
            $table->decimal('price', 12, 2);
            $table->string('unit', 40)->nullable(); // e.g. "per sticker", "12.5 kg"
            $table->string('image_path')->nullable(); // on the public disk
            $table->unsignedInteger('stock')->nullable(); // null = always available
            $table->unsignedSmallInteger('max_per_order')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['is_active', 'category']);
        });

        // A resident's order. Payment works like bills: paid once paid_at is set, with
        // "receipt sent" worked out from payment_proofs. The admin side moves `fulfilment`
        // from open to ready to completed (or cancelled).
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('total', 12, 2);
            $table->string('delivery_method', 20); // pickup, delivery
            $table->string('note', 500)->nullable();
            $table->string('fulfilment', 20)->default('open'); // open, ready, completed, cancelled
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });

        // What was ordered, with the name and price at the time of ordering.
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('unit', 40)->nullable();
            $table->decimal('unit_price', 12, 2);
            $table->unsignedSmallInteger('quantity');
            $table->decimal('line_total', 12, 2);
        });

        // Transfer receipts can now be for a bill or a store order.
        Schema::table('payment_proofs', function (Blueprint $table) {
            $table->foreignId('bill_id')->nullable()->change();
            $table->foreignId('order_id')->nullable()->after('bill_id')->constrained()->cascadeOnDelete();
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->after('bill_id')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('order_id');
        });
        Schema::table('payment_proofs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('order_id');
        });
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('products');
    }
};
