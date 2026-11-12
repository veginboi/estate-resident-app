<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Resources\BillResource;
use App\Models\Bill;
use App\Models\PaymentProof;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PaymentProofController extends Controller
{
    /**
     * Uploads a bank transfer receipt for a bill. The bill then shows "Awaiting confirmation"
     * until the estate confirms the payment.
     */
    public function store(Request $request, Bill $bill): JsonResponse
    {
        $user = $request->user();
        abort_unless($bill->user_id === $user->id, 404);

        $data = $request->validate([
            'receipt' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
            'amount' => ['required', 'numeric', 'min:1', 'max:100000000'],
            'paid_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'transfer_reference' => ['nullable', 'string', 'max:60'],
        ], [
            'receipt.mimes' => 'The receipt must be a photo (JPG or PNG) or a PDF.',
            'receipt.max' => 'The receipt must be smaller than 5 MB.',
            'paid_on.before_or_equal' => "The payment date can't be in the future.",
        ]);

        $status = $bill->load('latestProof')->status();
        if ($status === Bill::PAID) {
            throw ValidationException::withMessages(['receipt' => 'This bill has already been paid.']);
        }
        if ($status === Bill::PENDING) {
            throw ValidationException::withMessages(['receipt' => 'A receipt for this bill is already waiting for confirmation.']);
        }

        $file = $request->file('receipt');
        $path = $file->store("payment-proofs/{$user->id}", 'local');

        $proof = $bill->proofs()->create([
            'user_id' => $user->id,
            'amount' => $data['amount'],
            'paid_on' => $data['paid_on'],
            'transfer_reference' => filled($data['transfer_reference'] ?? null) ? trim($data['transfer_reference']) : null,
            'file_path' => $path,
            'file_name' => mb_substr($file->getClientOriginalName() ?: 'receipt', 0, 255),
            'file_mime' => $file->getMimeType() ?? 'application/octet-stream',
            'file_size' => $file->getSize(),
            'status' => PaymentProof::PENDING,
        ]);

        // The admin side picks pending receipts up from the payment_proofs table.
        Log::info('Payment receipt uploaded', ['proof_id' => $proof->id, 'bill_id' => $bill->id, 'resident' => $user->resident_code]);

        return (new BillResource($bill->fresh('latestProof')))->response()->setStatusCode(201);
    }
}
