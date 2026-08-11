import type { Metadata } from 'next';
import { fetchCart } from '@/lib/cart/actions';
import { productRepository } from '@/lib/catalog';
import { bestSellersProxy } from '@/lib/catalog/recommendations';
import { noIndex } from '@/lib/seo/metadata';

import { Breadcrumb, SectionHeading } from '@/components/ui/primitives';
import { CartPageClient } from '@/components/cart/cart-page-client';
import { ProductGrid } from '@/components/product/product-card';
import { RecentlyViewedSection } from '@/components/product/recently-viewed-section';

export const metadata: Metadata = {
  title: 'Your bag',
  robots: noIndex,
};

// The cart is per-visitor and must never be cached.
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const [cart, products] = await Promise.all([
    fetchCart(),
    productRepository.getAllProducts(),
  ]);

  const inCart = new Set(cart?.lines.map((line) => line.merchandise.product.handle) ?? []);
  const crossSells = bestSellersProxy(products, 12)
    .filter((product) => !inCart.has(product.handle))
    .slice(0, 4);

  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumb items={[{ href: '/', label: 'Home' }, { label: 'Your bag' }]} />
      </div>

      <h1 className="pb-8 text-4xl">Your bag</h1>

      <CartPageClient initialCart={cart} />

      {crossSells.length > 0 && (
        <section aria-labelledby="cross-sell-heading" className="mt-20">
          <SectionHeading title="You might also like" className="mb-7" />
          <h2 id="cross-sell-heading" className="sr-only">
            Recommended products
          </h2>
          <ProductGrid products={crossSells} listName="Cart cross-sell" priorityCount={0} />
        </section>
      )}

      <RecentlyViewedSection />
    </div>
  );
}
