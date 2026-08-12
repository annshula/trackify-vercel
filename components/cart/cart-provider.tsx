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
  /** True while a cart fetch is in flight — drives the skeleton. */
  loading: boolean;
  /** Re-reads cart + session from the server. */
  refresh: () => Promise<void>;
  /** Quantity shown to the user — the optimistic value when one is pending. */
  quantityOf: (lineId: string) => number;
  /** Sum of all line quantities — units in the bag, not products. */
  totalQuantity: number;
  /** Distinct products in the bag. This is what the badge shows. */
  itemCount: number;
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
  const [loading, setLoading] = React.useState(initialCart === null);
  const [pending, setPending] = React.useState<PendingLines>({});
  const [inFlight, setInFlight] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const { push } = useToast();

  // Tracks the newest request so a slow earlier response cannot overwrite a
  // fresher one that already landed.
  const requestId = React.useRef(0);

  /**
   * Pulls cart + session from the server.
   *
   * Also runs whenever the bag is opened, not just once on mount: the cart can
   * change outside this tab — another device for a signed-in shopper, or a
   * second tab — and a stale bag at the moment of checkout is the worst place
   * to be wrong.
   */
  const refresh = React.useCallback(async (signal?: AbortSignal, markLoading = true) => {
    const id = ++requestId.current;
    // The mount call passes false: `loading` already starts true when there is
    // no server-provided cart, so flipping it here would be a synchronous
    // setState inside an effect for no change in value.
    if (markLoading) setLoading(true);

    try {
      const response = await fetch('/api/cart', { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('failed');

      const data = (await response.json()) as { cart: Cart | null; signedIn: boolean };
      if (id !== requestId.current) return;

      setCart(data.cart);
      setSignedIn(data.signedIn);
      // The server is authoritative; drop any optimistic overlay it supersedes.
      setPending({});
    } catch (error) {
      // An empty bag is the correct fallback; never block the storefront.
      if ((error as Error).name === 'AbortError') return;
    } finally {
      if (id === requestId.current) {
        setReady(true);
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    /*
     * Fetching on mount and storing the result is exactly what this effect is
     * for. The rule flags any call to a function that contains setState and
     * cannot see that every update here happens in an async continuation after
     * the request resolves — the one synchronous update is skipped by passing
     * markLoading: false. The request is aborted on unmount, and a stale
     * response is discarded by the requestId check.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh(controller.signal, false);
    return () => controller.abort();
  }, [refresh]);

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

  /**
   * Distinct products in the bag, not units.
   *
   * Two of the same t-shirt reads as "1 item" to a shopper, not "2" — the
   * badge and "N items" copy count lines, and a line optimistically dropped to
   * 0 (mid-removal) does not count until the server confirms it is gone.
   */
  const itemCount = React.useMemo(() => {
    if (!cart) return 0;
    return cart.lines.filter((line) => {
      const optimistic = pending[line.id];
      return typeof optimistic === 'number' ? optimistic > 0 : true;
    }).length;
  }, [cart, pending]);

  const open = React.useCallback(() => {
    setIsOpen(true);
    track('view_cart', {});
    // Re-read on open so the bag reflects anything that changed elsewhere.
    void refresh();
  }, [refresh]);

  const close = React.useCallback(() => setIsOpen(false), []);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      signedIn,
      ready,
      loading,
      quantityOf,
      totalQuantity,
      itemCount,
      isOpen,
      isPending: inFlight > 0,
      open,
      close,
      refresh,
      run,
      setCart,
    }),
    [
      cart,
      signedIn,
      ready,
      loading,
      quantityOf,
      totalQuantity,
      itemCount,
      isOpen,
      inFlight,
      open,
      close,
      refresh,
      run,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
