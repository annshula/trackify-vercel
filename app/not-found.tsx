import Link from 'next/link';
import { productRepository } from '@/lib/catalog';
import { bestSellersProxy } from '@/lib/catalog/recommendations';
import { ButtonLink } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/product-card';
import { SectionHeading } from '@/components/ui/primitives';
import { SearchIcon } from '@/components/ui/icons';

/**
 * 404.
 *
 * A dead end is a lost visit, so this recovers it: search, popular products,
 * and clear ways back into the catalog.
 */
export default async function NotFound() {
  const products = await productRepository.getAllProducts().catch(() => []);
  const popular = bestSellersProxy(products, 4);

  return (
    <div className="container-page">
      <div className="mx-auto max-w-lg py-16 text-center sm:py-24">
        <p className="font-display text-6xl text-accent">404</p>
        <h1 className="mt-4 text-3xl">We could not find that page</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          The link may be out of date, or the product may no longer be available.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/collections" size="lg">
            Shop everything
          </ButtonLink>
          <ButtonLink href="/search" variant="outline" size="lg">
            <SearchIcon size={18} />
            Search
          </ButtonLink>
        </div>

        <p className="mt-6 text-sm text-ink-subtle">
          Looking for an order?{' '}
          <Link href="/account/orders" className="text-ink underline underline-offset-4">
            Check your order history
          </Link>
          .
        </p>
      </div>

      {popular.length > 0 && (
        <section aria-labelledby="notfound-popular" className="pb-10">
          <SectionHeading title="Popular right now" align="center" className="mb-8" />
          <h2 id="notfound-popular" className="sr-only">
            Popular products
          </h2>
          <ProductGrid products={popular} listName="404 recovery" priorityCount={0} />
        </section>
      )}
    </div>
  );
}
