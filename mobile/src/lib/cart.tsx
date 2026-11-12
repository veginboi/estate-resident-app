import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "./session";
import type { Product } from "./types";

export type CartItem = { product: Product; quantity: number };

type Cart = {
  items: CartItem[];
  count: number;
  total: number;
  quantityOf: (productId: number) => number;
  setQuantity: (product: Product, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<Cart | null>(null);

/**
 * The estate store cart. It lives in memory so it survives moving between the shop, the cart
 * and orders. The API always re-prices orders, so the prices here are only for display.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { signedIn } = useSession();

  // Someone else may sign in on this phone next.
  useEffect(() => {
    if (signedIn === false) setItems([]);
  }, [signedIn]);

  const setQuantity = useCallback((product: Product, quantity: number) => {
    setItems((list) => {
      const capped = product.maxQuantity !== null ? Math.min(quantity, product.maxQuantity) : quantity;
      const rest = list.filter((i) => i.product.id !== product.id);
      if (capped <= 0) return rest;
      const index = list.findIndex((i) => i.product.id === product.id);
      const next = { product, quantity: capped };
      return index === -1 ? [...list, next] : list.map((i) => (i.product.id === product.id ? next : i));
    });
  }, []);

  const value = useMemo<Cart>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      total: items.reduce((n, i) => n + i.product.price * i.quantity, 0),
      quantityOf: (id) => items.find((i) => i.product.id === id)?.quantity ?? 0,
      setQuantity,
      clear: () => setItems([]),
    }),
    [items, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
