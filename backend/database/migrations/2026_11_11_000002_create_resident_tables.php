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
        Schema::create('family_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('role', 50);
            $table->unsignedTinyInteger('age');
            $table->string('gender', 10);
            $table->timestamps();
        });

        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30);
            $table->string('name');
            $table->string('number', 50);
            $table->string('colour', 50)->nullable();
            $table->string('details')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'number']);
        });

        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('family_member_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->date('date');
            $table->time('out_at')->nullable();
            $table->string('out_with')->nullable();
            $table->time('in_at')->nullable();
            $table->string('in_with')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'date']);
        });

        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('text');
            $table->dateTime('remind_at');
            $table->timestamp('done_at')->nullable();
            $table->timestamps();
        });

        Schema::create('estate_updates', function (Blueprint $table) {
            $table->id();
            $table->string('author')->default('Estate Admin');
            $table->text('body');
            $table->string('image_path')->nullable();
            $table->timestamp('published_at')->index();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->timestamp('paid_at');
            $table->timestamps();
        });

        Schema::create('emergency_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('open');
            $table->text('note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('plots', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('label');
            $table->string('kind', 20);
            $table->unsignedSmallInteger('x');
            $table->unsignedSmallInteger('y');
            $table->unsignedSmallInteger('w');
            $table->unsignedSmallInteger('h');
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plots');
        Schema::dropIfExists('emergency_alerts');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('estate_updates');
        Schema::dropIfExists('reminders');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('properties');
        Schema::dropIfExists('family_members');
    }
};
