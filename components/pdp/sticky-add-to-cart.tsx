"use client";

import * as React from "react";
import { SmartImage as Image } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import { usePurchase } from "./purchase-context";
import { AddToCartButton } from "./add-to-cart-button";

/**
 * Bottom purchase bar, all sizes.
 *
 * Appears only once the hero's own button has scrolled above the viewport,
 * and steps aside while the final CTA (#final-cta) is on screen so there are
 * never two buy buttons competing. While visible it pads the page bottom by
 * its own height, so nothing — footer links included — ends up underneath it.
 */
export function StickyAddToCart() {
  const { product, variant, heroCta } = usePurchase();
  const [pastHero, setPastHero] = React.useState(false);
  const [finalInView, setFinalInView] = React.useState(false);
  const visible = pastHero && !finalInView;

  React.useEffect(() => {
    if (!heroCta) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(heroCta);
    return () => observer.disconnect();
  }, [heroCta]);

  React.useEffect(() => {
    const target = document.getElementById("final-cta");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setFinalInView(Boolean(entry?.isIntersecting)));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle("pdp-sticky-open", visible);
    return () => document.documentElement.classList.remove("pdp-sticky-open");
  }, [visible]);

  const image = (variant?.imageId && product.images.find((img) => img.id === variant.imageId)) || product.images[0];
  const hasOptions = product.variants.length > 1;

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(36_26_16/0.18)] backdrop-blur-md transition-transform duration-300 ease-out-soft motion-reduce:transition-none",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="container-page flex h-18 items-center gap-4">
        {image && (
          <span className="relative hidden size-12 shrink-0 overflow-hidden rounded-md bg-surface-sunken sm:block">
            <Image src={image.url} alt="" fill sizes="48px" className="object-cover" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="hidden truncate text-sm font-medium sm:block">{product.title}</p>
          <p className="truncate text-sm text-ink-muted">
            {variant && (
              <span className="font-medium text-ink tabular-nums sm:font-normal sm:text-ink-muted">
                {formatMoney(variant.price, variant.currencyCode, { trimZeroCents: true })}
              </span>
            )}
            {hasOptions && variant && <span> · {variant.title}</span>}
          </p>
          <a href="#purchase" className="text-xs text-ink-subtle underline underline-offset-2 sm:hidden">
            Change options
          </a>
        </div>
        <div className="w-44 shrink-0 sm:w-60">
          <AddToCartButton size="md" showPrice={false} />
        </div>
      </div>
    </div>
  );
}
