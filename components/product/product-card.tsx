"use client";

import * as React from "react";
import { SmartImage as Image } from "@/components/ui/smart-image";
import Link from "next/link";
import type { CatalogProduct } from "@/types/catalog";
import { cn } from "@/lib/utils/cn";
import { BLUR_DATA_URL, primaryImage, secondaryImage } from "@/lib/utils/image";
import {
  colorSwatch,
  defaultVariant,
  isSoldOut,
  hasMarkdown,
  productRating,
  OPTION_IS_COLOR,
} from "@/lib/catalog/selectors";
import { Skeleton } from "@/components/ui/primitives";
import { WishlistButton } from "@/components/product/wishlist-button";
import { BagIcon, StarIcon } from "@/components/ui/icons";
import { useCart } from "@/components/cart/cart-provider";
import { useLocalizedAmount } from "@/components/localization/localization-provider";
import { addToCart } from "@/lib/cart/actions";
import { discountPercent, formatMoney } from "@/lib/utils/money";
import { track, toEcommerceItem } from "@/lib/analytics";

/**
 * Product card.
 *
 * Quiet by design: the photo carries the card, and everything else is one
 * calm line each — title (clamped to two lines so prices align across the
 * grid), rating, then price with colour dots. The whole card is one link via
 * a stretched title link; wishlist and quick-add sit above it as the only
 * nested controls, and only appear on hover/focus from `sm` up.
 */
export function ProductCard({
  product,
  priority = false,
  index = 0,
  listName,
  className,
  sizes = "(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 50vw",
}: {
  product: CatalogProduct;
  priority?: boolean;
  index?: number;
  listName?: string;
  className?: string;
  sizes?: string;
}) {
  const image = primaryImage(product);
  const hoverImage = secondaryImage(product);
  const soldOut = isSoldOut(product);
  const onSale = hasMarkdown(product);
  const rating = productRating(product);
  const variant = defaultVariant(product);

  const compareAt = variant?.compareAtPrice ?? null;

  // Always the default variant's own price (with its own compare-at), never
  // a "from X to Y" range — a range doesn't say what you'd actually pay for
  // the variant the card is about to add. Live, Shopify-reported price for
  // the shopper's chosen country when one is selected, falling back to the
  // catalog's cached base-currency price until then.
  const {
    amount: displayAmount,
    currencyCode: displayCurrency,
    compareAtAmount: displayCompareAt,
    loading: priceLoading,
  } = useLocalizedAmount(
    variant?.id ?? null,
    variant?.price ?? product.priceRange.min,
    variant?.currencyCode ?? product.priceRange.currencyCode,
    compareAt,
  );

  const colorOption = product.options.find((option) =>
    OPTION_IS_COLOR.test(option.name),
  );
  // Only colours we can render faithfully get a dot; the rest fold into "+N"
  // rather than printing raw option names ("Army Green", "Khaki") mid-card.
  const colorValues = colorOption?.values ?? [];
  const dots = colorValues
    .map((value) => ({ value, color: colorSwatch(value) }))
    .filter(
      (dot): dot is { value: string; color: string } => dot.color !== null,
    )
    .slice(0, 4);
  const extraColors = colorValues.length - dots.length;

  const savePercent = priceLoading
    ? null
    : discountPercent(displayAmount, displayCompareAt);
  const badge = soldOut
    ? "Sold out"
    : onSale && savePercent
      ? `Save ${savePercent}%`
      : isNew(product)
        ? "New"
        : null;

  const { run } = useCart();
  const [adding, setAdding] = React.useState(false);
  // Only offered when a single variant resolves the purchase unambiguously —
  // a size or colour choice still has to happen on the product page.
  const canQuickAdd =
    !soldOut && product.variants.length === 1 && variant !== null;

  const onQuickAdd = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!variant) return;
    setAdding(true);
    const result = await run(() =>
      addToCart({ variantId: variant.id, quantity: 1 }),
    );
    setAdding(false);
    if (result.ok) {
      track("add_to_cart", {
        currency: variant.currencyCode,
        value: variant.price,
        items: [
          toEcommerceItem(product, { quantity: 1, price: variant.price }),
        ],
      });
    }
  };

  const href = `/products/${product.handle}`;
  const onSelect = () =>
    track("select_item", {
      item_list_name: listName,
      items: [toEcommerceItem(product)],
    });

  return (
    <article
      className={cn("group reveal-item relative flex flex-col", className)}
      style={{ "--i": index % 12 } as React.CSSProperties}
    >
      {/* Image tile — white so supplier shots on white backgrounds sit
          seamlessly, with a hairline edge instead of a heavy frame. */}
      <div className="relative overflow-hidden rounded-2xl bg-surface-raised">
        <div className="relative aspect-4/5 w-full">
          {image ? (
            <>
              <Image
                src={image.url}
                // The title link names the card; the photo is decorative here.
                alt=""
                fill
                sizes={sizes}
                priority={priority}
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className={cn(
                  "object-cover transition-[opacity,transform] duration-700 ease-out-soft",
                  hoverImage && "group-hover:opacity-0",
                  !soldOut && "group-hover:scale-[1.04]",
                  soldOut && "opacity-50 grayscale-35",
                )}
              />
              {hoverImage && (
                <Image
                  src={hoverImage.url}
                  alt=""
                  fill
                  sizes={sizes}
                  loading="lazy"
                  wrapperClassName="absolute inset-0"
                  className="scale-[1.04] object-cover opacity-0 transition-opacity duration-700 ease-out-soft group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center text-xs text-ink-subtle">
              No image
            </div>
          )}
        </div>

        <span
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-ink/[0.07] ring-inset"
          aria-hidden="true"
        />

        {badge && (
          <span
            className={cn(
              "pointer-events-none absolute top-3 left-3 z-10 rounded-full px-2.5 py-1 text-[11px] leading-none font-medium tracking-wide backdrop-blur-md",
              badge.startsWith("Save")
                ? "bg-ink/85 text-ink-inverse"
                : "bg-surface-raised/85 text-ink shadow-e1",
            )}
          >
            {badge}
          </span>
        )}

        <div className="absolute top-2 right-2 z-10 transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:has-aria-pressed:opacity-100">
          <WishlistButton
            handle={product.handle}
            title={product.title}
            compact
          />
        </div>

        {canQuickAdd && (
          <button
            type="button"
            onClick={onQuickAdd}
            disabled={adding}
            aria-busy={adding || undefined}
            aria-label={`Add ${product.title} to bag`}
            className={cn(
              "absolute right-3 bottom-3 z-10 grid size-11 cursor-pointer place-items-center rounded-full bg-surface-raised/90 text-ink shadow-e2 backdrop-blur-md transition duration-300 ease-out-soft hover:bg-primary hover:text-on-primary disabled:opacity-60",
              // From sm: a full-width bar that rises in on hover/focus.
              "sm:left-3 sm:flex sm:h-11 sm:w-auto sm:translate-y-3 sm:items-center sm:justify-center sm:gap-2 sm:text-sm sm:font-medium sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100",
            )}
          >
            {adding ? (
              <svg
                viewBox="0 0 24 24"
                className="size-4.5 animate-spin"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeOpacity="0.25"
                  strokeWidth="2.5"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <BagIcon size={18} />
            )}
            <span className="hidden sm:inline">
              {adding ? "Adding…" : "Add to bag"}
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <h3 className="line-clamp-2 min-h-[2.75em] font-sans text-[0.9375rem] leading-snug font-medium tracking-normal text-ink">
          <Link
            href={href}
            onClick={onSelect}
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {/* Stretched link keeps the whole card clickable without nesting <a>. */}
            <span className="absolute inset-0" aria-hidden="true" />
            {product.title}
          </Link>
        </h3>

        {rating && rating.count > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
            <StarIcon
              size={12}
              fillLevel={1}
              className="text-accent"
              aria-hidden="true"
            />
            <span
              aria-hidden="true"
              className="font-medium text-ink tabular-nums"
            >
              {rating.value.toFixed(1)}
            </span>
            <span aria-hidden="true" className="tabular-nums">
              ({rating.count.toLocaleString("en-US")})
            </span>
            <span className="sr-only">
              Rated {rating.value.toFixed(1)} out of 5 from {rating.count}{" "}
              reviews
            </span>
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          {priceLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <p className="flex items-baseline gap-2">
              <span className="text-[0.9375rem] font-semibold text-ink tabular-nums">
                {formatMoney(displayAmount, displayCurrency, {
                  trimZeroCents: true,
                })}
              </span>
              {savePercent && displayCompareAt ? (
                <>
                  <span className="text-xs text-ink-subtle tabular-nums line-through">
                    {formatMoney(displayCompareAt, displayCurrency, {
                      trimZeroCents: true,
                    })}
                  </span>
                  <span className="sr-only">
                    , reduced by {savePercent} percent
                  </span>
                </>
              ) : null}
            </p>
          )}

          {colorValues.length > 1 && (
            <p className="flex shrink-0 items-center gap-1.5">
              {dots.length > 0 && (
                <span className="flex -space-x-1" aria-hidden="true">
                  {dots.map((dot) => (
                    <span
                      key={dot.value}
                      title={dot.value}
                      className="size-3.5 rounded-full ring-2 ring-canvas"
                      style={{ backgroundColor: dot.color }}
                    />
                  ))}
                </span>
              )}
              {extraColors > 0 && (
                <span
                  aria-hidden="true"
                  className="text-2xs text-ink-subtle tabular-nums"
                >
                  {dots.length > 0
                    ? `+${extraColors}`
                    : `${colorValues.length} colours`}
                </span>
              )}
              <span className="sr-only">{colorValues.length} colours</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/** "New" means published in the last 30 days — derived, not decorative. */
function isNew(product: CatalogProduct): boolean {
  const published = product.publishedAt ?? product.createdAt;
  const timestamp = Date.parse(published);
  if (!Number.isFinite(timestamp)) return false;
  return Date.now() - timestamp < 30 * 24 * 60 * 60 * 1000;
}

export function ProductGrid({
  products,
  listName,
  priorityCount = 4,
  className,
}: {
  products: CatalogProduct[];
  listName?: string;
  priorityCount?: number;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 lg:gap-x-7 xl:grid-cols-4",
        className,
      )}
    >
      {products.map((product, index) => (
        <li key={product.id} className="relative">
          <ProductCard
            product={product}
            index={index}
            listName={listName}
            priority={index < priorityCount}
          />
        </li>
      ))}
    </ul>
  );
}
