<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReceiptUploadRequest;
use App\Http\Resources\BillResource;
use App\Models\Bill;
use App\Models\PaymentProof;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class PaymentProofController extends Controller
{
    /**
     * Uploads a bank transfer receipt for a bill. The bill then shows "Awaiting confirmation"
     * until the estate confirms the payment.
     */
    public function store(ReceiptUploadRequest $request, Bill $bill): JsonResponse
    {
        $user = $request->user();
        abort_unless($bill->user_id === $user->id, 404);

        $status = $bill->load('latestProof')->status();
        if ($status === Bill::PAID) {
            throw ValidationException::withMessages(['receipt' => 'This bill has already been paid.']);
        }
        if ($status === Bill::PENDING) {
            throw ValidationException::withMessages(['receipt' => 'A receipt for this bill is already waiting for confirmation.']);
        }

        $proof = PaymentProof::fromUpload($request->file('receipt'), $user, $request->validated(), ['bill_id' => $bill->id]);

        // The admin side picks pending receipts up from the payment_proofs table.
        Log::info('Payment receipt uploaded', ['proof_id' => $proof->id, 'bill_id' => $bill->id, 'resident' => $user->resident_code]);

        return (new BillResource($bill->fresh('latestProof')))->response()->setStatusCode(201);
    }
}
