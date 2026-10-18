"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/money";
import { usePurchase } from "./purchase-context";
import { AddToCartButton } from "./add-to-cart-button";

/**
 * Floating add-to-bag bar for small screens.
 *
 * Appears once the hero's own button has scrolled above the viewport and is
 * hidden from lg up, where the buy box sits beside the sticky gallery. It is a
 * glass pill floating over the page rather than a full-width bar, so nothing
 * needs padding beneath it.
 */
export function StickyAddToCart() {
  const { product, variant, heroCta } = usePurchase();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!heroCta) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(heroCta);
    return () => observer.disconnect();
  }, [heroCta]);

  const hasOptions = product.variants.length > 1;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "glass fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20 rounded-card p-3 pl-5 transition-transform duration-500 ease-out-soft motion-reduce:transition-none lg:hidden",
        visible ? "translate-y-0" : "translate-y-[calc(100%+1.5rem)]",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-heading-3">
            {hasOptions && variant ? variant.title : product.title}
          </p>
          <p className="font-numeral text-body-sm font-medium text-ink-soft tabular-nums">
            {variant
              ? formatMoney(variant.price, variant.currencyCode, { trimZeroCents: true })
              : ""}
          </p>
        </div>
        <div className="shrink-0">
          <AddToCartButton size="md" showPrice={false} className="w-auto" />
        </div>
      </div>
    </div>
  );
}
