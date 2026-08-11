'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { CatalogProduct } from '@/types/catalog';
import { cn } from '@/lib/utils/cn';
import { formatPriceRange } from '@/lib/utils/money';
import { BLUR_DATA_URL, imageAlt, primaryImage, secondaryImage } from '@/lib/utils/image';
import { colorSwatch, defaultVariant, isSoldOut, hasMarkdown, productRating, OPTION_IS_COLOR } from '@/lib/catalog/selectors';
import { Badge, Price, Rating } from '@/components/ui/primitives';
import { WishlistButton } from '@/components/product/wishlist-button';
import { track, toEcommerceItem } from '@/lib/analytics';

/**
 * Product card.
 *
 * The whole card is one link (a single tab stop, one large touch target). The
 * wishlist button sits above it in the stacking order as the only nested
 * interactive element.
 */
export function ProductCard({
  product,
  priority = false,
  index = 0,
  listName,
  className,
  sizes = '(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 50vw',
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
  const singlePrice = product.priceRange.min === product.priceRange.max;

  const colorOption = product.options.find((option) => OPTION_IS_COLOR.test(option.name));
  const swatches = colorOption?.values.slice(0, 5) ?? [];

  return (
    <article
      className={cn('group reveal-item relative flex flex-col', className)}
      style={{ '--i': index % 12 } as React.CSSProperties}
    >
      <div className="relative overflow-hidden rounded-lg bg-surface-sunken">
        <Link
          href={`/products/${product.handle}`}
          className="block focus-visible:outline-none"
          onClick={() =>
            track('select_item', { item_list_name: listName, items: [toEcommerceItem(product)] })
          }
        >
          <div className="relative aspect-[4/5] w-full">
            {image ? (
              <>
                <Image
                  src={image.url}
                  alt={imageAlt(image, product.title)}
                  fill
                  sizes={sizes}
                  priority={priority}
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  className={cn(
                    'object-cover transition-[opacity,transform] duration-500 ease-out-soft',
                    hoverImage && 'group-hover:opacity-0',
                    !soldOut && 'group-hover:scale-[1.03]',
                    soldOut && 'opacity-60',
                  )}
                />
                {hoverImage && (
                  <Image
                    src={hoverImage.url}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes={sizes}
                    loading="lazy"
                    className="scale-[1.03] object-cover opacity-0 transition-opacity duration-500 ease-out-soft group-hover:opacity-100"
                  />
                )}
              </>
            ) : (
              <div className="grid h-full place-items-center text-xs text-ink-subtle">No image</div>
            )}

            {/* Ring drawn on top so it is never clipped by the image scale. */}
            <span
              className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-ink/5 ring-inset transition-shadow group-focus-within:ring-2 group-focus-within:ring-ring"
              aria-hidden="true"
            />
          </div>
        </Link>

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-col items-start gap-1.5">
            {soldOut && <Badge tone="neutral">Sold out</Badge>}
            {!soldOut && onSale && <Badge tone="danger">Sale</Badge>}
            {!soldOut && !onSale && isNew(product) && <Badge tone="inverse">New</Badge>}
          </div>
          <div className="pointer-events-auto">
            <WishlistButton handle={product.handle} title={product.title} compact />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 pt-3.5">
        {product.vendor && (
          <p className="text-2xs font-medium tracking-[0.12em] text-ink-subtle uppercase">{product.vendor}</p>
        )}

        <h3 className="font-sans text-sm leading-snug font-medium tracking-normal text-ink">
          <Link href={`/products/${product.handle}`} className="hover:underline underline-offset-4">
            {/* Stretched link keeps the whole card clickable without nesting <a>. */}
            <span className="absolute inset-0" aria-hidden="true" />
            {product.title}
          </Link>
        </h3>

        {rating && <Rating value={rating.value} count={rating.count} size={13} showValue={false} />}

        <div className="mt-auto pt-1">
          {singlePrice ? (
            <Price
              amount={product.priceRange.min}
              compareAt={compareAt}
              currencyCode={product.priceRange.currencyCode}
              size="sm"
            />
          ) : (
            <span className="text-sm font-medium tabular-nums text-ink">
              {formatPriceRange(product.priceRange.min, product.priceRange.max, product.priceRange.currencyCode, {
                trimZeroCents: true,
              })}
            </span>
          )}
        </div>

        {swatches.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            {swatches.map((value) => {
              const color = colorSwatch(value);
              return color ? (
                <span
                  key={value}
                  title={value}
                  className="size-3.5 rounded-full ring-1 ring-ink/15 ring-inset"
                  style={{ backgroundColor: color }}
                />
              ) : (
                <span key={value} className="text-2xs text-ink-subtle">
                  {value}
                </span>
              );
            })}
            {(colorOption?.values.length ?? 0) > 5 && (
              <span className="text-2xs text-ink-subtle">+{(colorOption?.values.length ?? 0) - 5}</span>
            )}
          </div>
        )}
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
        'grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4',
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
