'use client';

import * as React from 'react';
import { useLocalization } from '@/components/localization/localization-provider';
import { startCheckout } from '@/lib/cart/actions';
import { MAX_BAG_QUANTITY, type BagCatalog, type BagVariant } from '@/lib/cart/bag-catalog';
import { track } from '@/lib/analytics';
import { readAdIdentity } from '@/lib/analytics/ad-identity';

/**
 * The bag.
 *
 * Lines live in localStorage as `{ variantId, quantity }` only; names, labels
 * and prices are looked up in the server-provided `catalog`, so a stale browser
 * can never show or submit a price. Because nothing waits on a server, adding,
 * changing and deleting are instant. Shopify only hears about the bag when the
 * shopper presses Checkout (`startCheckout`), which creates the hosted checkout
 * and lets Shopify price it.
 *
 * Prices are shown live in the visitor's currency once localization resolves,
 * the same overlay the product page uses.
 */

export type BagLine = { variantId: string; quantity: number };

export type ResolvedLine = BagLine &
  BagVariant & {
    lineTotal: number;
    /** What the line would cost at its compare-at price (equals lineTotal when there is none). */
    compareAtTotal: number;
    /** Percent off the compare-at price; null when there is no markdown. */
    savedPercent: number | null;
  };

type CheckoutOutcome = { ok: true } | { ok: false; error: string; issues?: string[] };

type CartContextValue = {
  lines: ResolvedLine[];
  /** Distinct items in the bag — what the header badge shows. */
  itemCount: number;
  subtotal: number;
  /** Total saved against compare-at prices (0 when nothing has one). */
  discount: number;
  currency: string;
  isOpen: boolean;
  /** False until the saved bag has been read from this browser. */
  hydrated: boolean;
  signedIn: boolean;
  open: () => void;
  close: () => void;
  /** Adds to the bag (summing with what is already there) and opens it. */
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  checkout: () => Promise<CheckoutOutcome>;
  /** Screen-reader announcement for the last change. */
  announcement: string;
};

const CartContext = React.createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'trackify.bag.v1';

function readStored(): BagLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (line): line is BagLine =>
          typeof line?.variantId === 'string' &&
          Number.isInteger(line?.quantity) &&
          line.quantity > 0,
      )
      .slice(0, 20);
  } catch {
    return [];
  }
}

const round = (n: number) => Math.round(n * 100) / 100;

export function CartProvider({
  catalog,
  children,
}: {
  catalog: BagCatalog;
  children: React.ReactNode;
}) {
  const [raw, setRaw] = React.useState<BagLine[]>([]);
  const [hydrated, setHydrated] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [signedIn, setSignedIn] = React.useState(false);
  const [announcement, setAnnouncement] = React.useState('');
  const { localizedPriceFor, requestPrices } = useLocalization();

  // The saved bag can only be read in the browser, after hydration.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRaw(readStored());
    setHydrated(true);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setRaw(readStored());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    } catch {
      // Private mode / quota — the bag still works for this tab.
    }
  }, [raw, hydrated]);

  // Whether a customer is signed in is per-visitor, so it can't be baked into
  // the statically rendered layout; one small request after hydration.
  React.useEffect(() => {
    const controller = new AbortController();
    fetch('/api/session', { signal: controller.signal, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { signedIn?: boolean } | null) => setSignedIn(Boolean(data?.signedIn)))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Every line's live price is needed up front.
  React.useEffect(() => {
    if (raw.length > 0) requestPrices(raw.map((line) => line.variantId));
  }, [raw, requestPrices]);

  // Every line's live price must have landed before any of them is used.
  // Mixing live and base-currency lines would add two currencies into one
  // total, so until the whole bag is live it is shown in the catalog's currency.
  const localized = React.useMemo(
    () =>
      raw.length > 0 &&
      raw.every((line) => !catalog.variants[line.variantId] || localizedPriceFor(line.variantId) != null),
    [raw, catalog, localizedPriceFor],
  );

  // Lines whose variant no longer exists in the catalog are dropped silently.
  const lines = React.useMemo<ResolvedLine[]>(
    () =>
      raw.flatMap((line) => {
        const variant = catalog.variants[line.variantId];
        if (!variant) return [];
        const live = localized ? localizedPriceFor(line.variantId) : null;
        const liveAmount = live ? Number.parseFloat(live.amount) : NaN;
        const price = Number.isFinite(liveAmount) ? liveAmount : variant.price;
        const liveCompare = live?.compareAtAmount != null ? Number.parseFloat(live.compareAtAmount) : NaN;
        const compareAt = live
          ? Number.isFinite(liveCompare)
            ? liveCompare
            : null
          : variant.compareAtPrice;
        const hasMarkdown = compareAt != null && compareAt > price;
        return [
          {
            ...line,
            ...variant,
            price,
            lineTotal: round(price * line.quantity),
            compareAtTotal: round((hasMarkdown ? compareAt : price) * line.quantity),
            savedPercent: hasMarkdown ? Math.round((1 - price / compareAt) * 100) : null,
          },
        ];
      }),
    [raw, catalog, localized, localizedPriceFor],
  );

  // Shopify localizes every line into one currency together, so the first
  // resolved line's currency speaks for the whole bag.
  const currency =
    (localized
      ? raw
          .map((line) => localizedPriceFor(line.variantId)?.currencyCode)
          .find((code): code is string => Boolean(code))
      : undefined) ?? catalog.currency;

  const itemCount = lines.length;
  const subtotal = round(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const discount = round(lines.reduce((sum, line) => sum + line.compareAtTotal, 0) - subtotal);

  const add = React.useCallback(
    (variantId: string, quantity = 1) => {
      const variant = catalog.variants[variantId];
      if (!variant || !variant.available) return;
      const cap = Math.min(MAX_BAG_QUANTITY, variant.maxQuantity);
      setRaw((prev) => {
        const existing = prev.find((line) => line.variantId === variantId);
        if (existing) {
          return prev.map((line) =>
            line.variantId === variantId
              ? { ...line, quantity: Math.min(cap, line.quantity + quantity) }
              : line,
          );
        }
        return [...prev, { variantId, quantity: Math.min(cap, quantity) }];
      });
      setAnnouncement(
        `Added to bag: ${variant.productName}${variant.variantLabel ? `, ${variant.variantLabel}` : ''}.`,
      );
      setIsOpen(true);
      track('view_cart', {});
    },
    [catalog],
  );

  const setQuantity = React.useCallback(
    (variantId: string, quantity: number) => {
      const cap = Math.min(MAX_BAG_QUANTITY, catalog.variants[variantId]?.maxQuantity ?? MAX_BAG_QUANTITY);
      const next = Math.max(0, Math.min(cap, Math.round(quantity)));
      setRaw((prev) =>
        next === 0
          ? prev.filter((line) => line.variantId !== variantId)
          : prev.map((line) => (line.variantId === variantId ? { ...line, quantity: next } : line)),
      );
    },
    [catalog],
  );

  const remove = React.useCallback(
    (variantId: string) => {
      const line = lines.find((entry) => entry.variantId === variantId);
      if (line) {
        track('remove_from_cart', {
          currency,
          value: line.lineTotal,
          items: [{ item_id: line.handle, item_name: line.productName, quantity: line.quantity }],
        });
        setAnnouncement(`Removed from bag: ${line.productName}.`);
      }
      setRaw((prev) => prev.filter((entry) => entry.variantId !== variantId));
    },
    [lines, currency],
  );

  const checkout = React.useCallback(async (): Promise<CheckoutOutcome> => {
    if (lines.length === 0) return { ok: false, error: 'Your bag is empty.' };
    track('begin_checkout', {
      currency,
      value: subtotal,
      items: lines.map((line) => ({
        item_id: line.handle,
        item_name: line.productName,
        item_variant: line.variantLabel,
        price: line.price,
        quantity: line.quantity,
      })),
    });
    try {
      const result = await startCheckout({
        lines: lines.map(({ variantId, quantity }) => ({ variantId, quantity })),
        adIdentity: readAdIdentity(),
      });
      if (result.ok) {
        window.location.assign(result.checkoutUrl);
        return { ok: true };
      }
      // Something in the bag can no longer be bought: apply the corrections so
      // the shopper sees what changed before trying again.
      for (const fix of result.fixes ?? []) setQuantity(fix.variantId, fix.quantity);
      return { ok: false, error: result.error, issues: result.issues };
    } catch {
      return { ok: false, error: "We couldn't reach checkout. Check your connection and try again." };
    }
  }, [lines, currency, subtotal, setQuantity]);

  const open = React.useCallback(() => {
    setIsOpen(true);
    track('view_cart', {});
  }, []);
  const close = React.useCallback(() => setIsOpen(false), []);

  const value = React.useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount,
      subtotal,
      discount,
      currency,
      isOpen,
      hydrated,
      signedIn,
      open,
      close,
      add,
      setQuantity,
      remove,
      checkout,
      announcement,
    }),
    [
      lines,
      itemCount,
      subtotal,
      discount,
      currency,
      isOpen,
      hydrated,
      signedIn,
      open,
      close,
      add,
      setQuantity,
      remove,
      checkout,
      announcement,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}
