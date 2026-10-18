"use client";

import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/money";
import { Icon } from "./icon";
import { usePurchase } from "./purchase-context";

/**
 * The one Add to bag button, used by the hero and the sticky bar so every
 * surface shows the same state: idle → adding → added, plus sold out and
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
          : "Add to bag";

  return (
    <>
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        aria-disabled={disabled}
        className={cn(
          "btn-primary w-full",
          size === "md" && "min-h-12 px-5",
          status === "adding" && "cursor-wait",
          className,
        )}
      >
        {status === "adding" && (
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden="true"
          />
        )}
        {status === "added" && <Icon name="check" className="size-4" />}
        <span>{label}</span>
        {showPrice && total !== null && !soldOut && status === "idle" && (
          <span className="font-numeral tabular-nums opacity-80">
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
