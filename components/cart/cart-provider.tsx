'use client';

import * as React from 'react';
import type { Cart } from '@/types/commerce';
import type { CartActionState } from '@/lib/cart/actions';
import { useToast } from '@/components/ui/toast';
import { track } from '@/lib/analytics';

/**
 * Client-side session state: the Shopify cart plus sign-in status.
 *
 * Shopify remains the source of truth. This holds the last cart Shopify
 * returned, plus an optimistic quantity overlay so the UI responds instantly
 * while a server action is in flight; a failed action rolls the overlay back.
 *
 * The initial value is fetched from /api/cart after hydration rather than read
 * in the root layout. A layout that reads cookies makes every route dynamic,
 * which would cost static generation on product and collection pages.
 */

type PendingLines = Record<string, number>;

type CartContextValue = {
  cart: Cart | null;
  signedIn: boolean;
  /** False until the first /api/cart response lands. */
  ready: boolean;
  /** Quantity shown to the user — the optimistic value when one is pending. */
  quantityOf: (lineId: string) => number;
  totalQuantity: number;
  isOpen: boolean;
  isPending: boolean;
  open: () => void;
  close: () => void;
  /** Runs a cart server action with optimistic UI and toast feedback. */
  run: (
    action: () => Promise<CartActionState>,
    options?: { optimistic?: PendingLines; silent?: boolean },
  ) => Promise<CartActionState>;
  setCart: (cart: Cart | null) => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({
  initialCart = null,
  children,
}: {
  /** Server-provided cart, on the few routes that already render dynamically. */
  initialCart?: Cart | null;
  children: React.ReactNode;
}) {
  const [cart, setCart] = React.useState<Cart | null>(initialCart);
  const [signedIn, setSignedIn] = React.useState(false);
  const [ready, setReady] = React.useState(initialCart !== null);
  const [pending, setPending] = React.useState<PendingLines>({});
  const [inFlight, setInFlight] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const { push } = useToast();

  // One request after hydration establishes cart + session for the whole app.
  React.useEffect(() => {
    const controller = new AbortController();

    fetch('/api/cart', { signal: controller.signal, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
      .then((data: { cart: Cart | null; signedIn: boolean }) => {
        setCart(data.cart);
        setSignedIn(data.signedIn);
        setReady(true);
      })
      .catch((error) => {
        // An empty bag is the correct fallback; never block the storefront.
        if ((error as Error).name !== 'AbortError') setReady(true);
      });

    return () => controller.abort();
  }, []);

  const run = React.useCallback<CartContextValue['run']>(
    async (action, options = {}) => {
      const optimistic = options.optimistic ?? {};
      const rollback = { ...pending };

      if (Object.keys(optimistic).length > 0) {
        setPending((current) => ({ ...current, ...optimistic }));
      }
      setInFlight((count) => count + 1);

      try {
        const result = await action();

        if (result.ok) {
          if (result.cart) setCart(result.cart);
          // Clear the overlay only for the lines this call settled.
          setPending((current) => {
            const next = { ...current };
            for (const lineId of Object.keys(optimistic)) delete next[lineId];
            return next;
          });
          if (result.notice && !options.silent) push({ tone: 'success', message: result.notice });
        } else {
          setPending(rollback);
          // A failed action may still return the corrected cart.
          if (result.cart) setCart(result.cart);
          if (result.error && !options.silent) push({ tone: 'error', message: result.error });
        }

        return result;
      } catch {
        setPending(rollback);
        const message = 'Network problem. Check your connection and try again.';
        if (!options.silent) push({ tone: 'error', message });
        return { ok: false, cart, error: message };
      } finally {
        setInFlight((count) => Math.max(0, count - 1));
      }
    },
    [cart, pending, push],
  );

  const quantityOf = React.useCallback(
    (lineId: string) => {
      const optimistic = pending[lineId];
      if (typeof optimistic === 'number') return optimistic;
      return cart?.lines.find((line) => line.id === lineId)?.quantity ?? 0;
    },
    [cart, pending],
  );

  const totalQuantity = React.useMemo(() => {
    if (!cart) return 0;
    return cart.lines.reduce((sum, line) => {
      const optimistic = pending[line.id];
      return sum + (typeof optimistic === 'number' ? optimistic : line.quantity);
    }, 0);
  }, [cart, pending]);

  const open = React.useCallback(() => {
    setIsOpen(true);
    track('view_cart', {});
  }, []);

  const close = React.useCallback(() => setIsOpen(false), []);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      signedIn,
      ready,
      quantityOf,
      totalQuantity,
      isOpen,
      isPending: inFlight > 0,
      open,
      close,
      run,
      setCart,
    }),
    [cart, signedIn, ready, quantityOf, totalQuantity, isOpen, inFlight, open, close, run],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
