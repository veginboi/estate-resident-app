"use client";

import { Car, Home, KeyRound, Minus, Package, Plus, Receipt, Search, Shirt, ShoppingCart, Trash2, Upload, X, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BankCard, ReceiptUploadModal, formatDate, naira } from "@/components/payments";
import { Button, Card, EmptyState, ErrorState, LoadingState, Modal, cx } from "@/components/ui";
import { api, isMockMode } from "@/lib/api";
import type { CartLine, Order, OrderStatus, Product } from "@/lib/types";
import { useData } from "@/lib/use-data";

// Saved in the browser for each resident; it only changes when the resident changes it.
type SavedLine = CartLine & { name: string; price: number };
const cartKey = (residentId: number) => `le_cart:${residentId}`;

const CATEGORY_ICONS: Record<string, LucideIcon> = { "Access & Security": KeyRound, Home, Merchandise: Shirt, Vehicles: Car };

const STATUS: Record<OrderStatus, { label: string; className: string; help: string }> = {
  awaiting_payment: { label: "Awaiting payment", className: "bg-amber-50 text-amber-800", help: "Pay by bank transfer, then upload your receipt." },
  payment_submitted: { label: "Receipt sent", className: "bg-sky-50 text-sky-800", help: "The estate is checking your transfer." },
  processing: { label: "Paid · Preparing", className: "bg-brand-tint text-brand-dark", help: "Payment confirmed. The estate is preparing your order." },
  ready: { label: "Ready", className: "bg-brand-soft text-brand-dark", help: "" },
  completed: { label: "Completed", className: "bg-row text-ink", help: "" },
  cancelled: { label: "Cancelled", className: "bg-row text-muted", help: "" },
};

function readCart(residentId: number): SavedLine[] {
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey(residentId)) ?? "[]");
    return Array.isArray(saved)
      ? saved
          .filter((l) => Number.isInteger(l?.productId) && Number.isInteger(l?.quantity) && l.quantity > 0)
          .map((l) => ({ productId: l.productId, quantity: l.quantity, name: String(l.name ?? "Item"), price: Number(l.price) || 0 }))
      : [];
  } catch {
    return [];
  }
}

function saveCart(residentId: number, cart: SavedLine[]) {
  try {
    localStorage.setItem(cartKey(residentId), JSON.stringify(cart));
  } catch {
    /* storage unavailable; the cart still works until the page is reloaded */
  }
}

type CartRow = { productId: number; name: string; price: number; quantity: number; product: Product | null; available: boolean };

function Stepper({ value, max, onChange, label }: { value: number; max: number | null; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded border border-line" role="group" aria-label={`Quantity of ${label}`}>
      <button onClick={() => onChange(value - 1)} className="p-1.5 text-brand hover:bg-brand-tint" aria-label={`Remove one ${label}`}>
        <Minus size={16} />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={max !== null && value >= max}
        className="p-1.5 text-brand hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Add one more ${label}`}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

function ProductCard({ product, quantity, onSetQuantity }: { product: Product; quantity: number; onSetQuantity: (n: number) => void }) {
  const Icon = CATEGORY_ICONS[product.category] ?? Package;
  return (
    <Card className="flex flex-col overflow-hidden">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.imageUrl} alt="" className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-28 items-center justify-center bg-brand-tint text-brand" aria-hidden>
          <Icon size={40} />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-semibold text-ink">{product.name}</h3>
          <p className="text-xs text-muted">{product.category}</p>
        </div>
        {product.description && <p className="text-sm text-muted">{product.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <p>
            <span className="text-lg font-semibold">{naira(product.price)}</span>
            {product.unit && <span className="text-xs text-muted"> · {product.unit}</span>}
          </p>
          {!product.inStock ? (
            <span className="rounded bg-row px-2 py-1 text-xs font-medium text-muted">Out of stock</span>
          ) : quantity > 0 ? (
            <Stepper value={quantity} max={product.maxQuantity} onChange={onSetQuantity} label={product.name} />
          ) : (
            <Button onClick={() => onSetQuantity(1)} className="px-3 py-1.5 sm:text-sm">
              <Plus size={16} aria-hidden /> Add
            </Button>
          )}
        </div>
        {product.maxQuantity !== null && quantity >= product.maxQuantity && product.inStock && (
          <p className="text-xs text-amber-800">You can order at most {product.maxQuantity}.</p>
        )}
      </div>
    </Card>
  );
}

function CartPanel({
  lines,
  onSetQuantity,
  onRemove,
  onPlaced,
}: {
  lines: CartRow[];
  onSetQuantity: (product: Product, n: number) => void;
  onRemove: (productId: number) => void;
  onPlaced: (order: Order) => void;
}) {
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orderable = lines.filter((l) => l.available);
  const total = orderable.reduce((n, l) => n + l.price * l.quantity, 0);

  const place = async () => {
    setBusy(true);
    setError(null);
    try {
      const order = await api.placeOrder({
        items: orderable.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        deliveryMethod: delivery,
        note,
      });
      setNote("");
      onPlaced(order);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-brand">
        <ShoppingCart size={20} aria-hidden /> Your cart
      </h2>
      {lines.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Your cart is empty. Add items from the shop.</p>
      ) : (
        <div className="space-y-4">
          <ul className="divide-y divide-row">
            {lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-3 py-2.5">
                <div className={cx("min-w-0 flex-1", !l.available && "opacity-60")}>
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  {l.available ? (
                    <p className="text-xs text-muted">{naira(l.price)} each</p>
                  ) : (
                    <p className="text-xs text-danger">No longer available. It won&apos;t be ordered.</p>
                  )}
                </div>
                {l.available && l.product && (
                  <Stepper value={l.quantity} max={l.product.maxQuantity} onChange={(n) => onSetQuantity(l.product!, n)} label={l.name} />
                )}
                <button onClick={() => onRemove(l.productId)} className="rounded p-1 text-muted hover:bg-row hover:text-danger" aria-label={`Remove ${l.name} from cart`}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">How would you like to get it?</legend>
            {(
              [
                ["pickup", "Pick up at the estate office"],
                ["delivery", "Deliver to my house"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="delivery" value={value} checked={delivery === value} onChange={() => setDelivery(value)} className="accent-brand" />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="space-y-1">
            <label htmlFor="order-note" className="block text-sm font-medium">Note for the estate (optional)</label>
            <textarea
              id="order-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="e.g. best time to deliver"
              className="w-full rounded border border-line px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
            />
          </div>

          <div className="flex items-center justify-between border-t border-row pt-3">
            <span className="text-muted">Total</span>
            <span className="text-xl font-semibold">{naira(total)}</span>
          </div>
          {error && <ErrorState message={error} />}
          <Button onClick={place} disabled={busy || orderable.length === 0} className="w-full">{busy ? "Placing order…" : "Place order"}</Button>
          <p className="text-xs text-muted">After placing the order, pay by bank transfer and upload your receipt in My orders.</p>
        </div>
      )}
    </Card>
  );
}

function OrderCard({
  order,
  highlight,
  onUpload,
  onCancel,
  onOpenReceipt,
}: {
  order: Order;
  highlight: boolean;
  onUpload: () => void;
  onCancel: () => void;
  onOpenReceipt: () => void;
}) {
  const s = STATUS[order.status];
  const rejected = order.receipt?.status === "rejected" && order.status === "awaiting_payment";
  const help =
    order.status === "ready"
      ? order.deliveryMethod === "pickup"
        ? "Ready to collect at the estate office."
        : "On its way to your house."
      : s.help;

  return (
    <li className={cx("rounded-md border p-4 transition-colors", highlight ? "border-brand bg-brand-tint" : "border-row")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-mono text-sm font-semibold">{order.orderNumber}</p>
          <p className="text-xs text-muted">
            Ordered {formatDate(order.createdAt)} · {order.deliveryMethod === "pickup" ? "Pickup" : "Delivery"}
          </p>
        </div>
        <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.className)}>{s.label}</span>
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span>
              {i.quantity} × {i.name}
              {i.unit && <span className="text-muted"> ({i.unit})</span>}
            </span>
            <span className="whitespace-nowrap">{naira(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      {order.note && <p className="mt-2 text-xs text-muted">Note: {order.note}</p>}
      <div className="mt-3 flex items-center justify-between border-t border-row pt-3">
        <span className="text-sm text-muted">Total</span>
        <span className="font-semibold">{naira(order.total)}</span>
      </div>
      {help && <p className="mt-2 text-sm text-muted">{help}</p>}
      {rejected && (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-danger">
          Your last receipt wasn&apos;t accepted{order.receipt?.reviewNote ? `: ${order.receipt.reviewNote}` : "."} Please upload a new one.
        </p>
      )}
      {(order.canUploadReceipt || order.canCancel || (order.status === "payment_submitted" && order.receipt)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {order.canUploadReceipt && (
            <Button onClick={onUpload} className="px-3 py-1.5 sm:text-sm">
              <Upload size={16} aria-hidden /> Upload receipt
            </Button>
          )}
          {order.status === "payment_submitted" && order.receipt && (
            <Button variant="ghost" onClick={onOpenReceipt} className="px-3 py-1.5 sm:text-sm">
              <Receipt size={16} aria-hidden /> View receipt
            </Button>
          )}
          {order.canCancel && (
            <Button variant="ghost" onClick={onCancel} className="px-3 py-1.5 sm:text-sm">
              <X size={16} aria-hidden /> Cancel order
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

export default function StorePage() {
  const [tab, setTab] = useState<"shop" | "orders">("shop");
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<SavedLine[]>([]);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<Order | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const catalogue = useData(() => api.getProducts({ category: category ?? undefined, q: search }), [category, search]);
  const allProducts = useData(() => api.getProducts());
  const orders = useData(api.getOrders);
  const finance = useData(api.getFinanceSummary);
  const me = useData(api.getProfile);
  const residentId = me.data?.id ?? null;

  useEffect(() => {
    if (residentId !== null) setCart(readCart(residentId));
  }, [residentId]);
  const updateCart = (next: SavedLine[]) => {
    setCart(next);
    if (residentId !== null) saveCart(residentId, next);
  };
  const setQuantity = (product: Product, n: number) => {
    const capped = product.maxQuantity !== null && product.maxQuantity > 0 ? Math.min(n, product.maxQuantity) : n;
    const line = { productId: product.id, quantity: capped, name: product.name, price: product.price };
    const exists = cart.some((l) => l.productId === product.id);
    updateCart(
      capped <= 0
        ? cart.filter((l) => l.productId !== product.id)
        : exists
          ? cart.map((l) => (l.productId === product.id ? line : l))
          : [...cart, line],
    );
  };
  const removeLine = (productId: number) => updateCart(cart.filter((l) => l.productId !== productId));

  // Cart lines with the latest prices. Items no longer for sale stay in the cart (marked)
  // until the resident removes them.
  const cartLines = useMemo<CartRow[]>(() => {
    const catalogue = allProducts.data ? new Map(allProducts.data.products.map((p) => [p.id, p])) : null;
    return cart.map((l) => {
      const product = catalogue?.get(l.productId) ?? null;
      const max = product?.maxQuantity ?? null;
      return {
        productId: l.productId,
        name: product?.name ?? l.name,
        price: product?.price ?? l.price,
        quantity: max !== null && max > 0 ? Math.min(l.quantity, max) : l.quantity,
        product,
        available: catalogue === null ? true : !!product && product.inStock,
      };
    });
  }, [cart, allProducts.data]);
  const quantityOf = (id: number) => cart.find((l) => l.productId === id)?.quantity ?? 0;
  const cartCount = cartLines.filter((l) => l.available).reduce((n, l) => n + l.quantity, 0);
  const awaiting = orders.data?.filter((o) => o.status === "awaiting_payment").length ?? 0;

  const replaceOrder = (updated: Order) => orders.setData((list) => list?.map((o) => (o.id === updated.id ? updated : o)) ?? null);

  const cancel = async () => {
    if (!cancelling) return;
    setCancelBusy(true);
    setActionError(null);
    try {
      replaceOrder(await api.cancelOrder(cancelling.id));
      setNotice(`Order ${cancelling.orderNumber} was cancelled.`);
      setCancelling(null);
      allProducts.reload().catch(() => undefined);
    } catch (e) {
      setActionError((e as Error).message);
      setCancelling(null);
    } finally {
      setCancelBusy(false);
    }
  };

  const openReceipt = async (order: Order) => {
    if (!order.receipt) return;
    setActionError(null);
    try {
      await api.openReceiptFile(order.receipt.id);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-brand">Estate Store</h1>
        <div role="tablist" aria-label="Store" className="flex gap-2">
          {(
            [
              ["shop", "Shop", cartCount ? `${cartCount} in cart` : null],
              ["orders", "My orders", awaiting ? `${awaiting} to pay` : null],
            ] as const
          ).map(([key, label, badge]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cx(
                "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                tab === key ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand",
              )}
            >
              {label}
              {badge && (
                <span className={cx("rounded-full px-2 text-xs leading-5", tab === key ? "bg-white/25" : "bg-brand-soft text-brand-dark")}>{badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {notice && <p role="status" className="rounded bg-brand-soft px-4 py-3 text-sm font-medium text-brand-dark">{notice}</p>}
      {actionError && <ErrorState message={actionError} />}

      {tab === "shop" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="order-2 space-y-4 lg:order-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex flex-1 items-center gap-2 rounded border border-line bg-white px-3 py-2">
                <Search size={18} className="text-muted" aria-hidden />
                <span className="sr-only">Search the store</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the store" className="w-full bg-transparent text-sm outline-none" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Categories">
              {[null, ...(allProducts.data?.categories ?? [])].map((c) => (
                <button
                  key={c ?? "all"}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cx(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    category === c ? "border-brand bg-brand text-white" : "border-line bg-white hover:border-brand",
                  )}
                >
                  {c ?? "All"}
                </button>
              ))}
            </div>

            {catalogue.loading ? (
              <LoadingState />
            ) : catalogue.error ? (
              <ErrorState message={catalogue.error} />
            ) : !catalogue.data?.products.length ? (
              <EmptyState>{search ? "Nothing matches your search." : "The store has nothing for sale right now."}</EmptyState>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {catalogue.data.products.map((p) => (
                  <ProductCard key={p.id} product={p} quantity={quantityOf(p.id)} onSetQuantity={(n) => setQuantity(p, n)} />
                ))}
              </div>
            )}
          </div>

          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-28">
              <CartPanel
                lines={cartLines}
                onSetQuantity={setQuantity}
                onRemove={removeLine}
                onPlaced={(order) => {
                  const ordered = new Set(order.items.map((i) => i.productId));
                  updateCart(cart.filter((l) => !ordered.has(l.productId)));
                  orders.setData((list) => [order, ...(list ?? [])]);
                  allProducts.reload().catch(() => undefined);
                  setHighlightId(order.id);
                  setTab("orders");
                  setNotice(`Order ${order.orderNumber} placed. Pay ${naira(order.total)} by bank transfer, then upload your receipt below.`);
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {awaiting > 0 && finance.data && <BankCard bank={finance.data.bank} />}
          <Card className="p-5 sm:p-6">
            {orders.loading ? (
              <LoadingState />
            ) : orders.error ? (
              <ErrorState message={orders.error} />
            ) : !orders.data?.length ? (
              <EmptyState>You haven&apos;t ordered anything yet.</EmptyState>
            ) : (
              <ul className="space-y-4">
                {orders.data.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    highlight={o.id === highlightId}
                    onUpload={() => setUploading(o)}
                    onCancel={() => setCancelling(o)}
                    onOpenReceipt={() => openReceipt(o)}
                  />
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {isMockMode && <p className="text-center text-xs text-muted">Demo mode: orders and receipts aren&apos;t saved.</p>}

      <ReceiptUploadModal
        target={uploading && { key: `order-${uploading.id}`, title: `Order ${uploading.orderNumber}`, amount: uploading.total }}
        onClose={() => setUploading(null)}
        onSubmit={async (data) => {
          if (!uploading) return;
          const updated = await api.uploadOrderReceipt(uploading.id, data);
          replaceOrder(updated);
          setUploading(null);
          setNotice(`Receipt sent for ${updated.orderNumber}. We'll start preparing it once the estate confirms your transfer.`);
        }}
      />

      <Modal title="Cancel this order?" open={!!cancelling} onClose={() => setCancelling(null)}>
        <p className="mb-6 text-sm text-muted">
          {cancelling?.orderNumber} for {cancelling && naira(cancelling.total)} will be cancelled. Only cancel if you haven&apos;t paid for it yet.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setCancelling(null)}>Keep order</Button>
          <Button variant="danger" onClick={cancel} disabled={cancelBusy}>{cancelBusy ? "Cancelling…" : "Cancel order"}</Button>
        </div>
      </Modal>
    </div>
  );
}
