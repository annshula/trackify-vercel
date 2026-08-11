'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CatalogProduct, CatalogVariant } from '@/types/catalog';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Price, Rating } from '@/components/ui/primitives';
import { CheckIcon, HeartIcon, MinusIcon, PlusIcon, RefreshIcon, ShieldIcon, TruckIcon } from '@/components/ui/icons';
import { ProductGallery } from './product-gallery';
import {
  availableValuesFor,
  colorSwatch,
  defaultVariant,
  findVariantByOptions,
  lowStockCount,
  optionsOfVariant,
  productRating,
  OPTION_IS_COLOR,
} from '@/lib/catalog/selectors';
import { useCart } from '@/components/cart/cart-provider';
import { useWishlist } from '@/hooks/use-wishlist';
import { useToast } from '@/components/ui/toast';
import { addToCart, proceedToCheckout } from '@/lib/cart/actions';
import { track, toEcommerceItem } from '@/lib/analytics';

/**
 * The purchase surface: gallery + variant selection + add to cart.
 *
 * Flat by design — no shadows, no nested cards, no gradients. Hierarchy comes
 * from type scale, solid fills and hairline rules alone, which is what keeps a
 * premium storefront from reading as a generic template.
 *
 * Gallery, buy box and the mobile action bar are one client component because
 * all three read the same variant selection; splitting them would mean lifting
 * that state into a fourth component for no benefit.
 */
export function BuyBox({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { run, open } = useCart();

  const initialVariant = React.useMemo(() => {
    const requested = searchParams.get('variant');
    if (requested) {
      const match = product.variants.find((variant) => variant.id.endsWith(`/${requested}`));
      if (match) return match;
    }
    return defaultVariant(product);
  }, [product, searchParams]);

  const [selection, setSelection] = React.useState<Record<string, string>>(() =>
    initialVariant ? optionsOfVariant(initialVariant) : {},
  );
  const [quantity, setQuantity] = React.useState(1);
  const [adding, setAdding] = React.useState(false);
  const [buying, setBuying] = React.useState(false);

  const variant: CatalogVariant | null =
    findVariantByOptions(product, selection) ?? (product.options.length === 0 ? initialVariant : null);

  const rating = productRating(product);
  const lowStock = lowStockCount(variant);
  const soldOut = variant ? !variant.availableForSale : true;
  const activeMediaId = variant?.imageId ?? null;

  const selectableOptions = product.options.filter(
    (option) => option.values.length > 1 || option.values[0] !== 'Default Title',
  );

  React.useEffect(() => {
    track('view_item', {
      currency: product.priceRange.currencyCode,
      value: product.priceRange.min,
      items: [toEcommerceItem(product)],
    });
  }, [product]);

  // Keep the URL in step with the chosen variant so the page is shareable and
  // back/forward behave, without pushing a history entry per click.
  React.useEffect(() => {
    if (!variant) return;
    const numericId = variant.id.split('/').pop();
    if (!numericId) return;
    const params = new URLSearchParams(searchParams.toString());
    if (params.get('variant') === numericId) return;
    params.set('variant', numericId);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [variant, router, searchParams]);

  const selectOption = (name: string, value: string) => {
    setSelection((current) => {
      const next = { ...current, [name]: value };
      // If the new combination does not exist, relax the other options until a
      // real variant is found — never leave the customer on a dead end.
      if (findVariantByOptions(product, next)) return next;

      const fallback = product.variants.find((candidate) =>
        candidate.selectedOptions.some((option) => option.name === name && option.value === value),
      );
      return fallback ? optionsOfVariant(fallback) : next;
    });
  };

  const onAdd = React.useCallback(async () => {
    if (!variant) return;
    setAdding(true);
    const result = await run(() => addToCart({ variantId: variant.id, quantity }), { silent: true });
    setAdding(false);

    if (result.ok) {
      track('add_to_cart', {
        currency: variant.currencyCode,
        value: variant.price * quantity,
        items: [toEcommerceItem(product, { item_variant: variant.title, quantity, price: variant.price })],
      });
      open();
    }
  }, [variant, quantity, run, open, product]);

  const onBuyNow = async () => {
    if (!variant) return;
    setBuying(true);
    const added = await run(() => addToCart({ variantId: variant.id, quantity }), { silent: true });
    if (!added.ok) {
      setBuying(false);
      return;
    }
    track('begin_checkout', { currency: variant.currencyCode, value: variant.price * quantity });
    const result = await run(() => proceedToCheckout());
    if (!result.ok) {
      setBuying(false);
      open();
    }
  };

  return (
    <>
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        {/* Full-bleed below lg — cancels container-page's own inline padding so
            the gallery reads as a native image viewer rather than a boxed card. */}
        <div className="group -mx-4 sm:-mx-6 lg:col-span-7 lg:mx-0">
          <ProductGallery product={product} activeMediaId={activeMediaId} />
        </div>

        {/* Below lg the panel is pulled up over the image's bottom edge as a
            sheet — the native "photo, then detail slides up" pattern. */}
        <div className="relative z-10 -mt-6 rounded-t-3xl bg-canvas px-4 pt-7 sm:px-6 lg:col-span-5 lg:mt-0 lg:rounded-none lg:px-0 lg:pt-0">
          <div className="lg:sticky lg:top-24">
            <header>
              {product.vendor && (
                <p className="text-2xs font-semibold tracking-[0.2em] text-ink-subtle uppercase">
                  {product.vendor}
                </p>
              )}

              <h1 className="mt-2.5 font-display text-3xl leading-[1.1] tracking-tight text-balance">
                {product.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Price
                  amount={variant?.price ?? product.priceRange.min}
                  compareAt={variant?.compareAtPrice ?? null}
                  currencyCode={variant?.currencyCode ?? product.priceRange.currencyCode}
                  size="xl"
                />
                <span className="text-xs text-ink-subtle">Tax &amp; shipping at checkout</span>
              </div>

              {/* Flat attribute chips — the fastest way to read what this is,
                  and a far lighter surface than a bordered spec card. */}
              <ul className="mt-4 flex flex-wrap items-center gap-1.5">
                <StatusChip soldOut={soldOut} lowStock={lowStock} />
                {product.productType && <Chip>{product.productType}</Chip>}
                {rating && (
                  <li>
                    <a
                      href="#reviews"
                      className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line px-2.5 transition-colors hover:border-line-strong"
                    >
                      <Rating value={rating.value} count={rating.count} size={12} showValue />
                    </a>
                  </li>
                )}
                {variant?.sku && <Chip muted>SKU {variant.sku}</Chip>}
              </ul>
            </header>

            {selectableOptions.length > 0 && (
              <div className="mt-7 space-y-5">
                {selectableOptions.map((option) => {
                  const available = availableValuesFor(product, option.name, selection);
                  const isColor = OPTION_IS_COLOR.test(option.name);
                  const selected = selection[option.name];

                  return (
                    <fieldset key={option.id} className="min-w-0">
                      <legend className="mb-2.5 flex w-full items-baseline justify-between gap-3">
                        <span className="text-2xs font-semibold tracking-[0.14em] text-ink-subtle uppercase">
                          {option.name}
                        </span>
                        {selected && <span className="text-sm text-ink">{selected}</span>}
                      </legend>

                      <div className={cn('flex flex-wrap', isColor ? 'gap-2' : 'gap-1.5')}>
                        {option.values.map((value) => {
                          const isSelected = selected === value;
                          const isAvailable = available.has(value);
                          const swatch = isColor ? colorSwatch(value) : null;

                          if (swatch) {
                            return (
                              <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                onClick={() => selectOption(option.name, value)}
                                title={isAvailable ? value : `${value} — unavailable`}
                                className={cn(
                                  'relative grid size-9 place-items-center rounded-full transition-shadow duration-200',
                                  isSelected
                                    ? 'ring-2 ring-ink ring-offset-2 ring-offset-canvas'
                                    : 'ring-1 ring-line-strong hover:ring-ink',
                                )}
                              >
                                <span
                                  className="size-full rounded-full"
                                  style={{ backgroundColor: swatch }}
                                  aria-hidden="true"
                                />
                                <span className="sr-only">
                                  {value}
                                  {!isAvailable && ' (unavailable)'}
                                </span>
                                {!isAvailable && (
                                  <span
                                    className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--color-ink)_calc(50%-0.5px),var(--color-ink)_calc(50%+0.5px),transparent_calc(50%+0.5px))] opacity-40"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            );
                          }

                          return (
                            <button
                              key={value}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => selectOption(option.name, value)}
                              title={isAvailable ? value : `${value} — unavailable`}
                              className={cn(
                                'relative inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3.5 text-sm font-medium transition-colors duration-200',
                                isSelected
                                  ? 'bg-ink text-canvas'
                                  : 'bg-surface-sunken text-ink hover:bg-line',
                                // Unavailable stays selectable — the customer
                                // should see the sold-out variant, not have it
                                // silently disappear from the picker.
                                !isAvailable && !isSelected && 'text-ink-subtle',
                              )}
                            >
                              {value}
                              {!isAvailable && (
                                <>
                                  <span
                                    className="pointer-events-none absolute inset-0 rounded-lg bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),currentColor_calc(50%-0.5px),currentColor_calc(50%+0.5px),transparent_calc(50%+0.5px))] opacity-30"
                                    aria-hidden="true"
                                  />
                                  <span className="sr-only"> (unavailable)</span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            )}

            {/* Actions — hidden on mobile, where the sticky bar below owns them
                so the CTA is always within thumb reach. */}
            <div className="mt-7 hidden lg:block">
              <div className="flex items-stretch gap-2">
                <FlatStepper
                  value={quantity}
                  onChange={setQuantity}
                  max={maxQuantity(variant)}
                  disabled={soldOut}
                  label={`Quantity of ${product.title}`}
                />
                <Button
                  size="lg"
                  onClick={onAdd}
                  loading={adding}
                  disabled={soldOut || !variant || buying}
                  className="h-12 flex-1 rounded-lg"
                >
                  {soldOut ? 'Sold out' : 'Add to bag'}
                </Button>
                <SaveButton handle={product.handle} title={product.title} />
              </div>

              <Button
                variant="outline"
                fullWidth
                onClick={onBuyNow}
                loading={buying}
                disabled={soldOut || !variant || adding}
                className="mt-2 h-12 rounded-lg"
              >
                Buy it now
              </Button>
            </div>

            {/* Flat trust row — hairline separated, no bordered card. */}
            <ul className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-line">
              <TrustCell icon={<TruckIcon size={17} />} label="Tracked delivery" />
              <TrustCell icon={<RefreshIcon size={17} />} label="Easy returns" />
              <TrustCell icon={<ShieldIcon size={17} />} label="Secure checkout" />
            </ul>
          </div>
        </div>
      </div>

      <MobileActionBar
        product={product}
        variant={variant}
        quantity={quantity}
        onQuantityChange={setQuantity}
        soldOut={soldOut}
        adding={adding}
        onAdd={onAdd}
      />
    </>
  );
}

function maxQuantity(variant: CatalogVariant | null): number {
  if (variant?.inventoryPolicy === 'DENY' && typeof variant.inventoryQuantity === 'number') {
    return Math.max(1, Math.min(variant.inventoryQuantity, 99));
  }
  return 99;
}

/* ── Small flat primitives ─────────────────────────────────────────────── */

function Chip({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li
      className={cn(
        'inline-flex h-7 items-center rounded-full border border-line px-2.5 text-xs',
        muted ? 'text-ink-subtle' : 'text-ink-muted',
      )}
    >
      {children}
    </li>
  );
}

function StatusChip({ soldOut, lowStock }: { soldOut: boolean; lowStock: number | null }) {
  if (soldOut) {
    return (
      <li className="inline-flex h-7 items-center rounded-full bg-surface-sunken px-2.5 text-xs font-medium text-ink-muted">
        Sold out
      </li>
    );
  }

  if (lowStock !== null) {
    return (
      <li
        className="inline-flex h-7 items-center gap-1.5 rounded-full bg-warning-soft px-2.5 text-xs font-medium text-warning"
        role="status"
      >
        <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
        Only {lowStock} left
      </li>
    );
  }

  return (
    <li className="inline-flex h-7 items-center gap-1.5 rounded-full bg-success-soft px-2.5 text-xs font-medium text-success">
      <CheckIcon size={13} />
      In stock
    </li>
  );
}

function TrustCell({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex flex-col items-center gap-1.5 bg-canvas px-2 py-3.5 text-center">
      <span className="text-accent">{icon}</span>
      <span className="text-2xs leading-tight text-ink-muted">{label}</span>
    </li>
  );
}

/** Flat quantity stepper — solid fill, no borders, matching the CTA height. */
function FlatStepper({
  value,
  onChange,
  max,
  disabled,
  label,
  compact = false,
}: {
  value: number;
  onChange: (next: number) => void;
  max: number;
  disabled?: boolean;
  label: string;
  compact?: boolean;
}) {
  const clamp = (next: number) => Math.max(1, Math.min(max, next));

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center rounded-lg bg-surface-sunken',
        compact ? 'h-11' : 'h-12',
        disabled && 'opacity-50',
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={disabled || value <= 1}
        aria-label={`Decrease ${label.toLowerCase()}`}
        className="grid h-full w-10 place-items-center rounded-l-lg text-ink transition-colors hover:bg-line disabled:opacity-40"
      >
        <MinusIcon size={15} />
      </button>
      <span
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        className="min-w-6 text-center text-sm font-medium tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={disabled || value >= max}
        aria-label={`Increase ${label.toLowerCase()}`}
        className="grid h-full w-10 place-items-center rounded-r-lg text-ink transition-colors hover:bg-line disabled:opacity-40"
      >
        <PlusIcon size={15} />
      </button>
    </div>
  );
}

/** Square save button that matches the CTA's height rather than floating. */
function SaveButton({ handle, title }: { handle: string; title: string }) {
  const { has, toggle, hydrated } = useWishlist();
  const { push } = useToast();
  const saved = hydrated && has(handle);

  return (
    <button
      type="button"
      onClick={() => {
        const added = toggle(handle);
        if (added) track('add_to_wishlist', { items: [{ item_id: handle, item_name: title }] });
        push({
          tone: 'success',
          message: added ? `Saved ${title}` : `Removed ${title} from saved`,
          ...(added ? { action: { label: 'View', href: '/wishlist' } } : {}),
        });
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved items` : `Save ${title}`}
      className={cn(
        'grid size-12 shrink-0 place-items-center rounded-lg bg-surface-sunken text-ink transition-colors hover:bg-line active:scale-95',
        saved && 'text-danger',
      )}
    >
      <HeartIcon size={19} filled={saved} />
    </button>
  );
}

/**
 * Sticky mobile purchase bar.
 *
 * Lives inside BuyBox so it shares the real variant + quantity selection —
 * it adds the chosen variant directly rather than bouncing the customer back
 * up the page. Sits above the app's bottom tab bar and respects the safe area.
 */
function MobileActionBar({
  product,
  variant,
  quantity,
  onQuantityChange,
  soldOut,
  adding,
  onAdd,
}: {
  product: CatalogProduct;
  variant: CatalogVariant | null;
  quantity: number;
  onQuantityChange: (next: number) => void;
  soldOut: boolean;
  adding: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-14 z-30 border-t border-line bg-canvas/95 px-4 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md lg:hidden">
      <div className="flex items-center gap-2">
        <FlatStepper
          compact
          value={quantity}
          onChange={onQuantityChange}
          max={maxQuantity(variant)}
          disabled={soldOut}
          label={`Quantity of ${product.title}`}
        />
        <Button
          onClick={onAdd}
          loading={adding}
          disabled={soldOut || !variant}
          className="h-11 flex-1 rounded-lg"
        >
          {soldOut ? 'Sold out' : 'Add to bag'}
        </Button>
      </div>
    </div>
  );
}
