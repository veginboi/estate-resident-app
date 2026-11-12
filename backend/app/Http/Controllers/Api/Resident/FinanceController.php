<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Resources\BillResource;
use App\Http\Resources\PaymentResource;
use App\Models\Bill;
use App\Models\PaymentProof;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinanceController extends Controller
{
    /**
     * Totals for the top of the Finance page, plus the estate's bank details.
     */
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $open = $user->bills()->open()->with('latestProof')->get();
        $bank = config('estate.bank');

        return response()->json([
            'data' => [
                'outstanding' => (float) $open->sum('amount'),
                'openBills' => $open->count(),
                'overdueBills' => $open->filter(fn (Bill $b) => $b->status() === Bill::OVERDUE)->count(),
                'awaitingConfirmation' => $open->filter(fn (Bill $b) => $b->status() === Bill::PENDING)->count(),
                'paidThisYear' => (float) $user->payments()->where('paid_at', '>=', now()->startOfYear())->sum('amount'),
                'totalPaid' => (float) $user->payments()->sum('amount'),
                'bank' => filled($bank['account_number'] ?? null) ? [
                    'bankName' => $bank['name'],
                    'accountName' => $bank['account_name'],
                    'accountNumber' => $bank['account_number'],
                ] : null,
            ],
        ]);
    }

    /**
     * The resident's bills. ?status=open for unpaid ones (soonest due first),
     * ?status=paid for paid ones (most recent first). Without it, open bills come first.
     */
    public function bills(Request $request): AnonymousResourceCollection
    {
        $request->validate(['status' => ['nullable', Rule::in(['open', 'paid'])]]);
        $status = $request->query('status');
        $query = $request->user()->bills()->with('latestProof');

        $bills = match ($status) {
            'open' => $query->open()->orderBy('due_date')->orderBy('id')->limit(100)->get(),
            'paid' => $query->whereNotNull('paid_at')->orderByDesc('paid_at')->limit(100)->get(),
            default => $query->orderByRaw('case when paid_at is null then 0 else 1 end')
                ->orderBy('due_date')
                ->orderBy('id')
                ->limit(200)
                ->get(),
        };

        return BillResource::collection($bills);
    }

    public function bill(Request $request, Bill $bill): BillResource
    {
        abort_unless($bill->user_id === $request->user()->id, 404);

        return new BillResource($bill->load('latestProof'));
    }

    /**
     * Payments the estate has recorded for the resident, newest first.
     */
    public function payments(Request $request): AnonymousResourceCollection
    {
        $payments = $request->user()->payments()
            ->with('bill:id,title')
            ->orderByDesc('paid_at')
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        return PaymentResource::collection($payments);
    }

    /**
     * Downloads a transfer receipt the resident uploaded.
     */
    public function receiptFile(Request $request, PaymentProof $proof): StreamedResponse
    {
        abort_unless($proof->user_id === $request->user()->id, 404);

        $disk = Storage::disk('local');
        abort_unless($disk->exists($proof->file_path), 404);

        return $disk->download($proof->file_path, $proof->file_name, ['Content-Type' => $proof->file_mime]);
    }
}
