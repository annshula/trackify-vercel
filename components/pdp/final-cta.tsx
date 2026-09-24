"use client";

import { SmartImage as Image } from "@/components/ui/smart-image";
import { formatMoney } from "@/lib/utils/money";
import { PdpIcon } from "./pdp-icon";
import { usePurchase } from "./purchase-context";
import { AddToCartButton } from "./add-to-cart-button";

/**
 * The closing purchase moment. Buys the same selection as the hero (shared
 * purchase state), shows the product in the chosen colour, and repeats only
 * the reassurances the store actually offers. The sticky bar hides while this
 * is on screen — `id="final-cta"` is what it watches.
 */
export function FinalCTA({
  headline,
  subtitle,
  assurances,
}: {
  headline: string;
  subtitle: string | null;
  assurances: string[];
}) {
  const { product, variant } = usePurchase();
  const image = (variant?.imageId && product.images.find((img) => img.id === variant.imageId)) || product.images[0];
  const hasOptions = product.variants.length > 1;

  return (
    <section id="final-cta" aria-labelledby="final-cta-heading" className="bg-surface-sunken py-20 lg:py-28">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        {image && (
          <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-surface-raised shadow-e3">
            <Image
              src={image.url}
              alt={image.altText || product.title}
              fill
              sizes="(min-width: 1024px) 28rem, 90vw"
              className="object-contain"
            />
          </div>
        )}
        <div className="max-w-lg">
          <h2 id="final-cta-heading" className="text-4xl text-balance">
            {headline}
          </h2>
          {subtitle && <p className="mt-4 text-lg leading-relaxed text-ink-muted text-pretty">{subtitle}</p>}

          <p className="mt-8 flex flex-wrap items-baseline gap-x-3 text-ink-muted">
            {variant && (
              <span className="font-display text-2xl text-ink tabular-nums">
                {formatMoney(variant.price, variant.currencyCode, { trimZeroCents: true })}
              </span>
            )}
            {hasOptions && variant && (
              <span>
                {variant.title} ·{" "}
                <a href="#purchase" className="underline underline-offset-4 hover:text-ink">
                  change
                </a>
              </span>
            )}
          </p>

          <div className="mt-5 max-w-sm">
            <AddToCartButton size="lg" />
          </div>

          {assurances.length > 0 && (
            <ul className="mt-7 space-y-2.5">
              {assurances.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-ink-muted">
                  <PdpIcon icon="check" size={16} className="text-success" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
