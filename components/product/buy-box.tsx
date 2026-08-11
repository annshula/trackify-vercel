'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CatalogProduct, CatalogVariant } from '@/types/catalog';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/form';
import { Badge, Price, Rating } from '@/components/ui/primitives';
import { CheckIcon, RefreshIcon, ShieldIcon, TruckIcon } from '@/components/ui/icons';
import { WishlistButton } from './wishlist-button';
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
import { addToCart, proceedToCheckout } from '@/lib/cart/actions';
import { track, toEcommerceItem } from '@/lib/analytics';

/**
 * The purchase surface: gallery + variant selection + add to cart.
 *
 * Gallery and buy box are one client component because variant selection has
 * to drive the gallery, and splitting them would mean lifting that state into
 * a third component for no benefit.
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

  const onAdd = async () => {
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
  };

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
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:gap-12">
      <div className="group">
        <ProductGallery product={product} activeMediaId={activeMediaId} />
      </div>

      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <header className="flex flex-col gap-2.5">
          {product.vendor && (
            <p className="text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">
              {product.vendor}
            </p>
          )}
          <h1 className="text-3xl">{product.title}</h1>

          {rating && (
            <a href="#reviews" className="w-fit">
              <Rating value={rating.value} count={rating.count} />
            </a>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Price
              amount={variant?.price ?? product.priceRange.min}
              compareAt={variant?.compareAtPrice ?? null}
              currencyCode={variant?.currencyCode ?? product.priceRange.currencyCode}
              size="lg"
            />
            {soldOut && <Badge tone="neutral">Sold out</Badge>}
          </div>
          <p className="text-xs text-ink-subtle">Taxes and shipping calculated at checkout.</p>
        </header>

        {product.options
          .filter((option) => option.values.length > 1 || option.values[0] !== 'Default Title')
          .map((option) => {
            const available = availableValuesFor(product, option.name, selection);
            const isColor = OPTION_IS_COLOR.test(option.name);
            const selected = selection[option.name];

            return (
              <fieldset key={option.id} className="min-w-0">
                <legend className="mb-2.5 flex w-full items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{option.name}</span>
                  {selected && <span className="text-ink-muted">{selected}</span>}
                </legend>

                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const isSelected = selected === value;
                    const isAvailable = available.has(value);
                    const swatch = isColor ? colorSwatch(value) : null;

                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => selectOption(option.name, value)}
                        title={isAvailable ? value : `${value} — unavailable`}
                        className={cn(
                          'relative flex min-h-11 items-center justify-center gap-2 rounded-md border px-3.5 text-sm font-medium transition-all duration-200',
                          isSelected
                            ? 'border-ink bg-ink text-canvas'
                            : 'border-line-strong text-ink hover:border-ink',
                          // Unavailable stays selectable — customers should be able
                          // to see the sold-out variant, not have it vanish.
                          !isAvailable && !isSelected && 'text-ink-subtle',
                        )}
                      >
                        {swatch && (
                          <span
                            className="size-4 rounded-full ring-1 ring-ink/20 ring-inset"
                            style={{ backgroundColor: swatch }}
                            aria-hidden="true"
                          />
                        )}
                        {value}
                        {!isAvailable && (
                          <>
                            <span
                              className="pointer-events-none absolute inset-0 rounded-md bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),currentColor_calc(50%-0.5px),currentColor_calc(50%+0.5px),transparent_calc(50%+0.5px))] opacity-25"
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

        {lowStock !== null && (
          <p className="flex items-center gap-2 text-sm font-medium text-warning" role="status">
            <span className="size-1.5 animate-pulse rounded-full bg-warning" aria-hidden="true" />
            Only {lowStock} left in stock
          </p>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              max={
                variant?.inventoryPolicy === 'DENY' && typeof variant.inventoryQuantity === 'number'
                  ? Math.max(1, Math.min(variant.inventoryQuantity, 99))
                  : 99
              }
              disabled={soldOut}
            />
            <Button
              size="lg"
              fullWidth
              onClick={onAdd}
              loading={adding}
              disabled={soldOut || !variant || buying}
              className="flex-1"
            >
              {soldOut ? 'Sold out' : 'Add to bag'}
            </Button>
          </div>

          <Button
            size="lg"
            variant="outline"
            fullWidth
            onClick={onBuyNow}
            loading={buying}
            disabled={soldOut || !variant || adding}
          >
            Buy it now
          </Button>

          <WishlistButton handle={product.handle} title={product.title} className="w-full justify-center" />
        </div>

        {variant?.sku && (
          <p className="text-xs text-ink-subtle">
            SKU <span className="font-medium text-ink-muted">{variant.sku}</span>
          </p>
        )}

        <ul className="grid gap-3 rounded-lg border border-line bg-surface p-4">
          <Assurance icon={<TruckIcon size={18} />} title="Tracked delivery">
            Follow your order from dispatch to doorstep in your account.
          </Assurance>
          <Assurance icon={<RefreshIcon size={18} />} title="Easy returns">
            Start a return from your order history if it is not right.
          </Assurance>
          <Assurance icon={<ShieldIcon size={18} />} title="Secure checkout">
            Payment is handled by Shopify. We never see your card details.
          </Assurance>
        </ul>
      </div>
    </div>
  );
}

function Assurance({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-accent">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-ink-muted">{children}</span>
      </span>
    </li>
  );
}

/** Sticky mobile purchase bar. Appears once the main CTA scrolls away. */
export function StickyBuyBar({ product }: { product: CatalogProduct }) {
  const [visible, setVisible] = React.useState(false);
  const { open } = useCart();
  const variant = defaultVariant(product);
  const soldOut = !variant?.availableForSale;

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 640);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'fixed inset-x-0 bottom-14 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 ease-out-soft lg:hidden',
        visible ? 'translate-y-0' : 'pointer-events-none translate-y-full',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.title}</p>
          <Price
            amount={variant?.price ?? product.priceRange.min}
            compareAt={variant?.compareAtPrice ?? null}
            currencyCode={product.priceRange.currencyCode}
            size="sm"
          />
        </div>
        <Button
          onClick={() => {
            // The full buy box owns variant choice; send the customer there.
            document.getElementById('buy-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (soldOut) return;
            open();
          }}
          disabled={soldOut}
          className="shrink-0"
        >
          {soldOut ? 'Sold out' : 'Add to bag'}
        </Button>
      </div>
    </div>
  );
}

export function InStockPill() {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
      <CheckIcon size={15} />
      In stock
    </span>
  );
}
