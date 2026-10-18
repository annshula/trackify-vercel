"use client";

import * as React from "react";
import type { CatalogProduct, CatalogVariant } from "@/types/catalog";
import { useCart } from "@/components/cart/cart-provider";
import { track, toEcommerceItem } from "@/lib/analytics";
import {
  defaultVariant,
  findVariantByOptions,
  optionsOfVariant,
} from "@/lib/catalog/selectors";

/**
 * One purchase state for the whole PDP.
 *
 * The hero panel, the sticky bar and the final CTA all buy the same thing, so
 * they share one selection instead of each keeping their own — changing the
 * colour in the hero changes what the sticky bar adds.
 *
 * The page is statically rendered with the default variant. A shared
 * `?variant=` link is applied after mount (reading window.location rather
 * than useSearchParams keeps the purchase panel in the static HTML instead of
 * behind a Suspense fallback).
 */

export type AddStatus = "idle" | "adding" | "added" | "error";

type PurchaseContextValue = {
  product: CatalogProduct;
  variant: CatalogVariant | null;
  selection: Record<string, string>;
  selectOption: (name: string, value: string) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  maxQuantity: number;
  /** True when the chosen variant exists but can't be bought. */
  soldOut: boolean;
  /** True when the chosen option combination has no variant at all. */
  unavailable: boolean;
  status: AddStatus;
  error: string | null;
  add: () => Promise<void>;
  /** The hero's primary button — the sticky bar shows once it scrolls away. */
  heroCta: HTMLElement | null;
  setHeroCta: (element: HTMLElement | null) => void;
};

const PurchaseContext = React.createContext<PurchaseContextValue | null>(null);

export function usePurchase(): PurchaseContextValue {
  const value = React.useContext(PurchaseContext);
  if (!value) throw new Error("usePurchase must be used inside <PurchaseProvider>");
  return value;
}

const MAX_QUANTITY = 10;

export function PurchaseProvider({
  product,
  children,
}: {
  product: CatalogProduct;
  children: React.ReactNode;
}) {
  const { add: addToBag } = useCart();
  const [selection, setSelection] = React.useState<Record<string, string>>(() => {
    const initial = defaultVariant(product);
    return initial ? optionsOfVariant(initial) : {};
  });
  const [quantity, setQuantityState] = React.useState(1);
  const [status, setStatus] = React.useState<AddStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [heroCta, setHeroCta] = React.useState<HTMLElement | null>(null);

  const variant = findVariantByOptions(product, selection);
  const soldOut = variant ? !variant.availableForSale : false;
  const unavailable = !variant;
  const maxQuantity =
    variant?.inventoryPolicy === "DENY" && typeof variant.inventoryQuantity === "number"
      ? Math.max(1, Math.min(MAX_QUANTITY, variant.inventoryQuantity))
      : MAX_QUANTITY;

  // Apply a shared ?variant= link once, after hydration.
  React.useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("variant");
    if (!requested) return;
    const match = product.variants.find((v) => v.id.split("/").pop() === requested);
    // The URL is only readable after hydration; this is a one-time sync from it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (match) setSelection(optionsOfVariant(match));
  }, [product]);

  // Keep the URL shareable without adding a history entry per click.
  React.useEffect(() => {
    const numericId = variant?.id.split("/").pop();
    if (!numericId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("variant") === numericId) return;
    url.searchParams.set("variant", numericId);
    window.history.replaceState(window.history.state, "", url);
  }, [variant]);

  // custom.meta_pixel_id, when set, also inits a second Meta pixel client-side
  // (ProductMetaPixel, rendered in app/products/[handle]/page.tsx) — passing
  // it here routes this product's browser events to both the global pixel and
  // its own dedicated one, alongside the existing CAPI-only Purchase routing
  // in services/webhooks/conversions.ts.
  const metaPixelId = product.metafields["custom.meta_pixel_id"] || undefined;

  React.useEffect(() => {
    track(
      "view_item",
      {
        currency: product.priceRange.currencyCode,
        value: product.priceRange.min,
        items: [toEcommerceItem(product)],
      },
      metaPixelId,
    );
  }, [product, metaPixelId]);

  // "Added" is a moment, not a state — fall back to the normal label.
  React.useEffect(() => {
    if (status !== "added") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  const selectOption = React.useCallback(
    (name: string, value: string) => {
      setError(null);
      setStatus("idle");
      setSelection((current) => {
        const next = { ...current, [name]: value };
        if (findVariantByOptions(product, next)) return next;
        // Relax the other options rather than strand the shopper on a combination that doesn't exist.
        const fallback = product.variants.find((candidate) =>
          candidate.selectedOptions.some((o) => o.name === name && o.value === value),
        );
        return fallback ? optionsOfVariant(fallback) : next;
      });
    },
    [product],
  );

  const setQuantity = React.useCallback(
    (next: number) => setQuantityState(Math.max(1, Math.min(maxQuantity, Math.round(next) || 1))),
    [maxQuantity],
  );

  // The bag is browser-side, so adding is instant: the item is in the bag (and
  // the bag is open) before this function returns.
  const add = React.useCallback(async () => {
    if (!variant || soldOut) return;
    setError(null);
    addToBag(variant.id, quantity);
    setStatus("added");
    track(
      "add_to_cart",
      {
        currency: variant.currencyCode,
        value: variant.price * quantity,
        items: [toEcommerceItem(product, { item_variant: variant.title, quantity, price: variant.price })],
      },
      metaPixelId,
    );
  }, [variant, soldOut, addToBag, quantity, product, metaPixelId]);

  const value: PurchaseContextValue = {
    product,
    variant,
    selection,
    selectOption,
    quantity,
    setQuantity,
    maxQuantity,
    soldOut,
    unavailable,
    status,
    error,
    add,
    heroCta,
    setHeroCta,
  };

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}
