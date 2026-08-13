'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { CatalogProduct } from '@/types/catalog';
import { Button } from '@/components/ui/button';
import { Price, Skeleton } from '@/components/ui/primitives';
import { CheckIcon } from '@/components/ui/icons';
import { defaultVariant } from '@/lib/catalog/selectors';
import { primaryImage, imageAlt } from '@/lib/utils/image';
import { formatMoney } from '@/lib/utils/money';
import { useCart } from '@/components/cart/cart-provider';
import { useLocalization } from '@/components/localization/localization-provider';
import { useToast } from '@/components/ui/toast';
import { addToCart } from '@/lib/cart/actions';
import { track, toEcommerceItem } from '@/lib/analytics';

/**
 * "Frequently bought together".
 *
 * Suggestions come from real catalog relationships (shared collection,
 * different product type). The anchor product is not included — the customer is
 * already choosing it in the buy box above, including its variant.
 */
export function CompleteTheLook({
  anchor,
  products,
}: {
  anchor: CatalogProduct;
  products: CatalogProduct[];
}) {
  const { run } = useCart();
  const { push } = useToast();
  const { ready, localizedPriceFor, isPriceLoading, requestPrices } = useLocalization();
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(products.map((product) => product.id)),
  );
  const [adding, setAdding] = React.useState(false);

  // Prefetch every suggestion's variant price once, up front — not one at a
  // time as each gets checked/unchecked (which doesn't change what needs
  // fetching anyway, since all of them start selected).
  React.useEffect(() => {
    const variantIds = products
      .map((product) => defaultVariant(product)?.id)
      .filter((id): id is string => Boolean(id));
    requestPrices(variantIds);
  }, [products, requestPrices]);

  /**
   * Resolves a product's display price: the live Shopify-converted price for
   * the shopper's chosen country when one has landed, otherwise the
   * catalog's base-currency price. `localizedPriceFor`/`isPriceLoading` are
   * plain functions from context (not hooks), so calling them per-item
   * inside a .map() below is fine — no rules-of-hooks issue.
   */
  const resolvePrice = (variant: ReturnType<typeof defaultVariant>) => {
    if (!variant)
      return {
        amount: 0,
        currencyCode: anchor.priceRange.currencyCode,
        compareAtAmount: null as number | null,
        loading: false,
      };
    const live = localizedPriceFor(variant.id);
    if (live) {
      const parsed = Number.parseFloat(live.amount);
      const compareAtParsed = live.compareAtAmount !== null ? Number.parseFloat(live.compareAtAmount) : null;
      return {
        amount: Number.isFinite(parsed) ? parsed : variant.price,
        currencyCode: live.currencyCode,
        compareAtAmount: compareAtParsed !== null && Number.isFinite(compareAtParsed) ? compareAtParsed : null,
        loading: false,
      };
    }
    // Before the initial /api/localization fetch resolves, a returning
    // visitor's saved currency choice is still unknown — show loading rather
    // than assuming "no selection" and flashing the base price.
    return {
      amount: variant.price,
      currencyCode: variant.currencyCode,
      compareAtAmount: variant.compareAtPrice ?? null,
      loading: !ready || isPriceLoading(variant.id),
    };
  };

  const chosen = products.filter((product) => selected.has(product.id));
  const chosenPrices = chosen.map((product) => resolvePrice(defaultVariant(product)));
  const total = chosenPrices.reduce((sum, price) => sum + price.amount, 0);
  // Every chosen item resolves under the same selected country, so they
  // never disagree on currency — the first one (if any) speaks for all.
  const currency = chosenPrices[0]?.currencyCode ?? anchor.priceRange.currencyCode;

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addAll = async () => {
    setAdding(true);
    let added = 0;

    for (const product of chosen) {
      const variant = defaultVariant(product);
      if (!variant?.availableForSale) continue;
      const result = await run(() => addToCart({ variantId: variant.id, quantity: 1 }), { silent: true });
      if (result.ok) {
        added += 1;
        track('add_to_cart', {
          currency: variant.currencyCode,
          value: variant.price,
          items: [toEcommerceItem(product, { quantity: 1, price: variant.price })],
        });
      }
    }

    setAdding(false);

    // One summary toast rather than one per item — each add above is `silent`
    // so a five-item selection cannot stack five notifications. The drawer
    // stays closed; the header badge reflects the new count.
    if (added > 0) {
      push({
        tone: 'success',
        message: added === 1 ? 'Added to bag' : `${added} items added to bag`,
        action: { label: 'View bag', href: '/cart' },
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <section aria-labelledby="ctl-heading" className="mt-14">
      <h2 id="ctl-heading" className="text-2xl">
        Complete the look
      </h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Pieces from the same collection that work with {anchor.title}.
      </p>

      <ul className="mt-6 space-y-3">
        {products.map((product) => {
          const variant = defaultVariant(product);
          const image = primaryImage(product);
          const isChecked = selected.has(product.id);
          const soldOut = !variant?.availableForSale;
          const itemPrice = resolvePrice(variant);

          return (
            <li key={product.id}>
              <label
                className={`flex cursor-pointer items-center gap-4 rounded-lg border p-3 transition-colors ${
                  isChecked ? 'border-line-strong bg-surface' : 'border-line hover:bg-surface'
                } ${soldOut ? 'opacity-55' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked && !soldOut}
                  disabled={soldOut}
                  onChange={() => toggle(product.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`grid size-5 shrink-0 place-items-center rounded-xs border transition-colors ${
                    isChecked && !soldOut ? 'border-ink bg-ink text-canvas' : 'border-line-strong'
                  }`}
                >
                  {isChecked && !soldOut && <CheckIcon size={13} />}
                </span>

                <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
                  {image && (
                    <Image
                      src={image.url}
                      alt={imageAlt(image, product.title)}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <Link
                    href={`/products/${product.handle}`}
                    onClick={(event) => event.stopPropagation()}
                    className="block truncate text-sm font-medium hover:underline underline-offset-4"
                  >
                    {product.title}
                  </Link>
                  {product.productType && (
                    <span className="block text-xs text-ink-subtle">{product.productType}</span>
                  )}
                  {soldOut && <span className="block text-xs font-medium text-danger">Sold out</span>}
                </span>

                {itemPrice.loading ? (
                  <Skeleton className="h-5 w-14 shrink-0" />
                ) : (
                  <Price
                    amount={itemPrice.amount}
                    compareAt={itemPrice.compareAtAmount}
                    currencyCode={itemPrice.currencyCode}
                    size="sm"
                    className="shrink-0"
                  />
                )}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-sunken px-4 py-3.5">
        <p className="text-sm">
          <span className="text-ink-muted">
            {chosen.length} item{chosen.length === 1 ? '' : 's'} selected ·{' '}
          </span>
          <span className="font-medium tabular-nums">
            {formatMoney(total, currency, { trimZeroCents: true })}
          </span>
        </p>
        <Button onClick={addAll} loading={adding} disabled={chosen.length === 0}>
          Add selected
        </Button>
      </div>
    </section>
  );
}
