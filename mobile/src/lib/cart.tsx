import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import { useSession } from "./session";
import { readJson, writeJson } from "./storage";
import type { Product } from "./types";

export type CartItem = { product: Product; quantity: number; available: boolean };

type Saved = { items: { product: Product; quantity: number }[] };

type Cart = {
  /** Every item the resident added, including ones that are no longer for sale. */
  items: CartItem[];
  /** Items that can be ordered right now. */
  orderable: CartItem[];
  count: number;
  total: number;
  quantityOf: (productId: number) => number;
  setQuantity: (product: Product, quantity: number) => void;
  remove: (productId: number) => void;
  /** Takes out the items that were just ordered. */
  removeOrdered: (productIds: number[]) => void;
  /** Updates prices, limits and availability from a full product list. */
  syncProducts: (products: Product[]) => void;
};

const CartContext = createContext<Cart | null>(null);

// Points at the resident whose cart was last open, so it can load straight away next time.
const OWNER_FILE = "cart-owner.json";
const cartFile = (residentId: number) => `cart-${residentId}.json`;

/**
 * The estate store cart. It's saved on the phone for each resident, so it survives closing the
 * app and signing out. It only changes when the resident changes it, or when they place an
 * order with the items in it. The API always re-prices orders; prices here are for display.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { signedIn } = useSession();
  const [owner, setOwner] = useState<number | null>(null);
  const [saved, setSaved] = useState<Saved["items"]>([]);
  const [catalogue, setCatalogue] = useState<Map<number, Product> | null>(null);
  const loadedFor = useRef<number | null>(null);

  // Work out whose cart to show.
  useEffect(() => {
    let active = true;
    if (signedIn === false) {
      setOwner(null);
      setSaved([]);
      loadedFor.current = null;
      writeJson(OWNER_FILE, null); // the next person to sign in shouldn't see this cart, even briefly
      return;
    }
    if (!signedIn) return;
    readJson<number>(OWNER_FILE).then((last) => active && last && setOwner((o) => o ?? last));
    api
      .getProfile()
      .then((p) => {
        if (!active) return;
        setOwner(p.id);
        writeJson(OWNER_FILE, p.id);
      })
      .catch(() => undefined); // offline: keep the last known resident's cart
    return () => {
      active = false;
    };
  }, [signedIn]);

  // Load that resident's saved cart.
  useEffect(() => {
    if (owner === null) return;
    let active = true;
    loadedFor.current = null;
    readJson<Saved>(cartFile(owner)).then((data) => {
      if (!active) return;
      setSaved(Array.isArray(data?.items) ? data.items.filter((i) => i?.product?.id && i.quantity > 0) : []);
      loadedFor.current = owner;
    });
    return () => {
      active = false;
    };
  }, [owner]);

  // Save every change (only once the saved cart has loaded, so it's never overwritten by an empty one).
  useEffect(() => {
    if (owner !== null && loadedFor.current === owner) writeJson(cartFile(owner), { items: saved } satisfies Saved);
  }, [saved, owner]);

  const setQuantity = useCallback((product: Product, quantity: number) => {
    setSaved((list) => {
      const capped = product.maxQuantity !== null && product.maxQuantity > 0 ? Math.min(quantity, product.maxQuantity) : quantity;
      if (capped <= 0) return list.filter((i) => i.product.id !== product.id);
      const exists = list.some((i) => i.product.id === product.id);
      return exists ? list.map((i) => (i.product.id === product.id ? { product, quantity: capped } : i)) : [...list, { product, quantity: capped }];
    });
  }, []);

  const syncProducts = useCallback((products: Product[]) => {
    const byId = new Map(products.map((p) => [p.id, p]));
    setCatalogue(byId);
    setSaved((list) =>
      list.map((i) => {
        const latest = byId.get(i.product.id);
        if (!latest) return i;
        const max = latest.maxQuantity;
        return { product: latest, quantity: max !== null && max > 0 ? Math.min(i.quantity, max) : i.quantity };
      }),
    );
  }, []);

  const value = useMemo<Cart>(() => {
    const items = saved.map((i) => {
      const latest = catalogue?.get(i.product.id);
      const available = catalogue === null ? i.product.inStock : !!latest && latest.inStock;
      return { ...i, available };
    });
    const orderable = items.filter((i) => i.available);
    return {
      items,
      orderable,
      count: orderable.reduce((n, i) => n + i.quantity, 0),
      total: orderable.reduce((n, i) => n + i.product.price * i.quantity, 0),
      quantityOf: (id) => saved.find((i) => i.product.id === id)?.quantity ?? 0,
      setQuantity,
      remove: (id) => setSaved((list) => list.filter((i) => i.product.id !== id)),
      removeOrdered: (ids) => setSaved((list) => list.filter((i) => !ids.includes(i.product.id))),
      syncProducts,
    };
  }, [saved, catalogue, setQuantity, syncProducts]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
