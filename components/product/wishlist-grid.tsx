'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWishlist } from '@/hooks/use-wishlist';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState, Price, Skeleton, Badge } from '@/components/ui/primitives';
import { HeartIcon, TrashIcon } from '@/components/ui/icons';
import { useCart } from '@/components/cart/cart-provider';
import { addToCart } from '@/lib/cart/actions';

type WishlistProduct = {
  handle: string;
  title: string;
  vendor: string;
  price: number;
  currencyCode: string;
  image: { url: string; altText: string | null } | null;
  available: boolean;
};

/**
 * Saved items.
 *
 * Handles come from localStorage; the product data is resolved server-side from
 * the local catalog. A handle that no longer exists simply disappears rather
 * than rendering a broken card.
 */
export function WishlistGrid() {
  const { handles, remove, hydrated } = useWishlist();
  const { run, open } = useCart();
  const [products, setProducts] = React.useState<WishlistProduct[] | null>(null);
  const [addingHandle, setAddingHandle] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!hydrated || handles.length === 0) return;

    const controller = new AbortController();
    fetch(`/api/products?handles=${encodeURIComponent(handles.slice(0, 24).join(','))}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
      .then((data: { products: WishlistProduct[] }) => setProducts(data.products))
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setProducts([]);
      });

    return () => controller.abort();
  }, [handles, hydrated]);

  if (!hydrated || products === null) {
    return (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <li key={index}>
            <Skeleton className="aspect-[4/5] w-full rounded-lg" />
            <Skeleton className="mt-3 h-3.5 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </li>
        ))}
      </ul>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<HeartIcon size={24} />}
        title="Nothing saved yet"
        description="Tap the heart on any product to keep it here for later."
        action={<ButtonLink href="/collections" size="lg">Browse products</ButtonLink>}
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <li key={product.handle} className="flex flex-col">
          <div className="relative overflow-hidden rounded-lg bg-surface-sunken">
            <Link href={`/products/${product.handle}`} className="group block">
              <span className="relative block aspect-[4/5]">
                {product.image && (
                  <Image
                    src={product.image.url}
                    alt={product.image.altText ?? product.title}
                    fill
                    sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, 50vw"
                    className={`object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.03] ${
                      product.available ? '' : 'opacity-60'
                    }`}
                  />
                )}
              </span>
            </Link>

            {!product.available && (
              <span className="absolute top-3 left-3">
                <Badge tone="neutral">Sold out</Badge>
              </span>
            )}

            <button
              type="button"
              onClick={() => remove(product.handle)}
              aria-label={`Remove ${product.title} from saved items`}
              className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-surface/85 text-ink backdrop-blur-sm transition-colors hover:bg-surface hover:text-danger"
            >
              <TrashIcon size={17} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-1.5 pt-3.5">
            {product.vendor && (
              <p className="text-2xs font-medium tracking-[0.12em] text-ink-subtle uppercase">
                {product.vendor}
              </p>
            )}
            <Link
              href={`/products/${product.handle}`}
              className="text-sm leading-snug font-medium hover:underline underline-offset-4"
            >
              {product.title}
            </Link>
            <Price amount={product.price} currencyCode={product.currencyCode} size="sm" />

            <Button
              size="sm"
              variant="outline"
              fullWidth
              className="mt-2"
              disabled={!product.available}
              loading={addingHandle === product.handle}
              onClick={async () => {
                setAddingHandle(product.handle);
                // The saved list stores handles, not variants — fetch the
                // product's default variant before adding.
                const response = await fetch(
                  `/api/products/variant?handle=${encodeURIComponent(product.handle)}`,
                );
                setAddingHandle(null);
                if (!response.ok) return;

                const { variantId } = (await response.json()) as { variantId: string | null };
                if (!variantId) return;

                const result = await run(() => addToCart({ variantId, quantity: 1 }), { silent: true });
                if (result.ok) open();
              }}
            >
              {product.available ? 'Add to bag' : 'Sold out'}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
