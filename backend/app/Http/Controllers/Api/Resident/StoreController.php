<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReceiptUploadRequest;
use App\Http\Resources\OrderResource;
use App\Http\Resources\ProductResource;
use App\Models\Order;
use App\Models\PaymentProof;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StoreController extends Controller
{
    /**
     * Products on sale. ?category= and ?q= filter the list. meta.categories lists every
     * category with something on sale, for the filter chips.
     */
    public function products(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'category' => ['nullable', 'string', 'max:40'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $search = mb_strtolower(trim((string) $request->query('q')));

        $products = Product::active()
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->query('category')))
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $query->where(fn ($q) => $q->whereRaw('lower(name) like ?', [$like])->orWhereRaw('lower(description) like ?', [$like]));
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $categories = Product::active()->distinct()->orderBy('category')->pluck('category');

        return ProductResource::collection($products)->additional(['meta' => ['categories' => $categories]]);
    }

    /**
     * Places an order. Prices always come from the products table, never from the app.
     */
    public function placeOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.productId' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'deliveryMethod' => ['required', Rule::in([Order::PICKUP, Order::DELIVERY])],
            'note' => ['nullable', 'string', 'max:500'],
        ], [
            'items.required' => 'Your cart is empty.',
            'items.*.productId.distinct' => 'Each product can only be in the cart once.',
        ]);

        $order = DB::transaction(function () use ($request, $data) {
            $wanted = collect($data['items'])->mapWithKeys(fn ($i) => [(int) $i['productId'] => (int) $i['quantity']]);
            $products = Product::active()->whereKey($wanted->keys())->lockForUpdate()->get()->keyBy('id');

            $errors = [];
            foreach ($wanted as $productId => $quantity) {
                $product = $products->get($productId);
                $limit = $product?->orderLimit();
                if (! $product) {
                    $errors[] = 'One of the items in your cart is no longer for sale. Please remove it and try again.';
                } elseif (! $product->inStock()) {
                    $errors[] = "{$product->name} is out of stock.";
                } elseif ($limit !== null && $quantity > $limit) {
                    $errors[] = "You can order at most {$limit} of {$product->name}.";
                }
            }
            if ($errors) {
                throw ValidationException::withMessages(['items' => $errors]);
            }

            $lines = $wanted->map(function (int $quantity, int $productId) use ($products) {
                $product = $products[$productId];
                if ($product->stock !== null) {
                    $product->decrement('stock', $quantity);
                }

                return [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'unit' => $product->unit,
                    'unit_price' => $product->price,
                    'quantity' => $quantity,
                    'line_total' => self::fromKobo(self::toKobo($product->price) * $quantity),
                ];
            })->values();

            $order = $request->user()->orders()->create([
                'total' => self::fromKobo($lines->sum(fn (array $l) => self::toKobo($l['line_total']))),
                'delivery_method' => $data['deliveryMethod'],
                'note' => filled($data['note'] ?? null) ? trim($data['note']) : null,
                'fulfilment' => Order::OPEN,
            ]);
            $order->items()->createMany($lines->all());

            return $order;
        });

        Log::info('Store order placed', ['order' => $order->orderNumber(), 'resident' => $request->user()->resident_code]);

        return (new OrderResource($order->load(['items', 'latestProof'])))->response()->setStatusCode(201);
    }

    /**
     * The resident's orders, newest first.
     */
    public function orders(Request $request): AnonymousResourceCollection
    {
        $orders = $request->user()->orders()
            ->with(['items', 'latestProof'])
            ->latest('id')
            ->limit(100)
            ->get();

        return OrderResource::collection($orders);
    }

    public function order(Request $request, Order $order): OrderResource
    {
        $this->ensureOwnedBy($request, $order);

        return new OrderResource($order->load(['items', 'latestProof']));
    }

    /**
     * Cancels an order that hasn't been paid for yet and puts the items back in stock.
     */
    public function cancel(Request $request, Order $order): OrderResource
    {
        $this->ensureOwnedBy($request, $order);

        DB::transaction(function () use ($order) {
            $order = Order::whereKey($order->id)->lockForUpdate()->with(['items', 'latestProof'])->firstOrFail();
            if ($order->status() !== Order::AWAITING_PAYMENT) {
                throw ValidationException::withMessages([
                    'order' => "This order can't be cancelled because payment has already been sent. Please contact the estate office.",
                ]);
            }

            foreach ($order->items as $item) {
                Product::whereKey($item->product_id)->whereNotNull('stock')->increment('stock', $item->quantity);
            }
            $order->update(['fulfilment' => Order::CANCELLED, 'cancelled_at' => now()]);
        });

        return new OrderResource($order->fresh(['items', 'latestProof']));
    }

    /**
     * Uploads the bank transfer receipt for an order.
     */
    public function uploadReceipt(ReceiptUploadRequest $request, Order $order): JsonResponse
    {
        $this->ensureOwnedBy($request, $order);
        $user = $request->user();

        $status = $order->load('latestProof')->status();
        if ($status === Order::PAYMENT_SUBMITTED) {
            throw ValidationException::withMessages(['receipt' => 'A receipt for this order is already waiting for confirmation.']);
        }
        if ($status !== Order::AWAITING_PAYMENT) {
            throw ValidationException::withMessages([
                'receipt' => $status === Order::CANCELLED ? 'This order was cancelled.' : 'This order has already been paid.',
            ]);
        }

        $proof = PaymentProof::fromUpload($request->file('receipt'), $user, $request->validated(), ['order_id' => $order->id]);
        Log::info('Payment receipt uploaded', ['proof_id' => $proof->id, 'order' => $order->orderNumber(), 'resident' => $user->resident_code]);

        return (new OrderResource($order->fresh(['items', 'latestProof'])))->response()->setStatusCode(201);
    }

    // Money is added up in whole kobo so totals never pick up floating-point errors.
    private static function toKobo(string|int|float $naira): int
    {
        return (int) round(((float) $naira) * 100);
    }

    private static function fromKobo(int $kobo): string
    {
        return number_format($kobo / 100, 2, '.', '');
    }

    private function ensureOwnedBy(Request $request, Order $order): void
    {
        abort_unless($order->user_id === $request->user()->id, 404);
    }
}
