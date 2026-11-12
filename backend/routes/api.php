<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EstateMapController;
use App\Http\Controllers\Api\Resident\ActivityController;
use App\Http\Controllers\Api\Resident\ConversationController;
use App\Http\Controllers\Api\Resident\DashboardController;
use App\Http\Controllers\Api\Resident\EmergencyAlertController;
use App\Http\Controllers\Api\Resident\FamilyMemberController;
use App\Http\Controllers\Api\Resident\FinanceController;
use App\Http\Controllers\Api\Resident\MessageController;
use App\Http\Controllers\Api\Resident\NeighbourController;
use App\Http\Controllers\Api\Resident\PasswordController;
use App\Http\Controllers\Api\Resident\PaymentProofController;
use App\Http\Controllers\Api\Resident\ProfileController;
use App\Http\Controllers\Api\Resident\PropertyController;
use App\Http\Controllers\Api\Resident\ReminderController;
use App\Http\Controllers\Api\Resident\SettingsController;
use App\Http\Controllers\Api\Resident\StoreController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::prefix('resident')->group(function () {
        Route::get('/dashboard', DashboardController::class);

        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);

        Route::apiResource('family-members', FamilyMemberController::class)->except('show');
        Route::apiResource('properties', PropertyController::class)->except('show');

        Route::get('/activities', [ActivityController::class, 'index']);

        Route::patch('/reminders/{reminder}', [ReminderController::class, 'update']);

        Route::get('/settings', [SettingsController::class, 'show']);
        Route::put('/settings', [SettingsController::class, 'update']);

        Route::put('/password', [PasswordController::class, 'update']);

        Route::post('/emergency-alerts', [EmergencyAlertController::class, 'store'])->middleware('throttle:5,1');

        // Messages: the estate chatroom and one-to-one chats between residents
        Route::get('/conversations', [ConversationController::class, 'index']);
        Route::post('/conversations', [ConversationController::class, 'store']);
        Route::get('/conversations/unread', [ConversationController::class, 'unread']);
        Route::get('/conversations/{conversation}', [ConversationController::class, 'show'])->whereNumber('conversation');
        Route::get('/conversations/{conversation}/messages', [MessageController::class, 'index'])->whereNumber('conversation');
        Route::post('/conversations/{conversation}/messages', [MessageController::class, 'store'])
            ->whereNumber('conversation')
            ->middleware('throttle:30,1');
        Route::get('/neighbours', NeighbourController::class);

        // Finance: bills, bank transfer receipts and payment history
        Route::get('/finance', [FinanceController::class, 'summary']);
        Route::get('/bills', [FinanceController::class, 'bills']);
        Route::get('/bills/{bill}', [FinanceController::class, 'bill'])->whereNumber('bill');
        Route::post('/bills/{bill}/receipts', [PaymentProofController::class, 'store'])
            ->whereNumber('bill')
            ->middleware('throttle:10,1');
        Route::get('/receipts/{proof}/file', [FinanceController::class, 'receiptFile'])->whereNumber('proof');
        Route::get('/payments', [FinanceController::class, 'payments']);

        // Store: the estate shop
        Route::get('/store/products', [StoreController::class, 'products']);
        Route::get('/store/orders', [StoreController::class, 'orders']);
        Route::post('/store/orders', [StoreController::class, 'placeOrder'])->middleware('throttle:10,1');
        Route::get('/store/orders/{order}', [StoreController::class, 'order'])->whereNumber('order');
        Route::post('/store/orders/{order}/cancel', [StoreController::class, 'cancel'])->whereNumber('order');
        Route::post('/store/orders/{order}/receipts', [StoreController::class, 'uploadReceipt'])
            ->whereNumber('order')
            ->middleware('throttle:10,1');
    });

    Route::get('/estate/map', EstateMapController::class);
});
