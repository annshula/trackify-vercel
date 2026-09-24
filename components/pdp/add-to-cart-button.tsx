"use client";

import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/money";
import { usePurchase } from "./purchase-context";

/**
 * The one Add to Cart button, used by the hero, sticky bar and final CTA so
 * every surface shows the same state: idle → adding → added, plus sold out and
 * unavailable. The live region announces the outcome to screen readers.
 */
export function AddToCartButton({
  size = "lg",
  showPrice = true,
  announce = false,
  className,
}: {
  size?: "md" | "lg";
  showPrice?: boolean;
  /** Only one instance per page should own the screen-reader announcement. */
  announce?: boolean;
  className?: string;
}) {
  const { product, variant, quantity, soldOut, unavailable, status, add } = usePurchase();
  const disabled = soldOut || unavailable || status === "adding";
  const total = variant ? variant.price * quantity : null;

  const label = unavailable
    ? "Unavailable"
    : soldOut
      ? "Sold out"
      : status === "adding"
        ? "Adding…"
        : status === "added"
          ? "Added to bag"
          : "Add to cart";

  return (
    <>
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        aria-disabled={disabled}
        className={cn(
          "group relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition duration-200",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          size === "lg" ? "h-14 px-6 text-base" : "h-12 px-5 text-sm",
          status === "added"
            ? "bg-success text-white"
            : "bg-primary text-on-primary shadow-e2 hover:bg-primary-hover hover:shadow-e3 active:scale-[0.99]",
          (soldOut || unavailable) && "cursor-not-allowed bg-surface-sunken text-ink-subtle shadow-none hover:bg-surface-sunken hover:shadow-none",
          status === "adding" && "cursor-wait",
          className,
        )}
      >
        {status === "adding" && (
          <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
        )}
        {status === "added" && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
        <span>{label}</span>
        {showPrice && total !== null && !soldOut && status === "idle" && (
          <span className="tabular-nums opacity-80">
            <span aria-hidden="true">· </span>
            {formatMoney(total, product.priceRange.currencyCode, { trimZeroCents: true })}
          </span>
        )}
      </button>
      {announce && (
        <span className="sr-only" role="status" aria-live="polite">
          {status === "added" ? `${product.title} added to your bag` : ""}
        </span>
      )}
    </>
  );
}
