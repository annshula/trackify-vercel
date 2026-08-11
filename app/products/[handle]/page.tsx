import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { productRepository, redirectRepository } from '@/lib/catalog';
import { relatedProducts, complementaryProducts } from '@/lib/catalog/recommendations';
import { productMetadata } from '@/lib/seo/metadata';
import { JsonLd, breadcrumbSchema, productSchema } from '@/lib/seo/jsonld';

import { Breadcrumb, SectionHeading, Skeleton } from '@/components/ui/primitives';
import { BuyBox, StickyBuyBar } from '@/components/product/buy-box';
import { ProductDetails } from '@/components/product/product-details';
import { Reviews } from '@/components/product/reviews';
import { ProductGrid } from '@/components/product/product-card';
import { CompleteTheLook } from '@/components/product/complete-the-look';
import { RecentlyViewedSection } from '@/components/product/recently-viewed-section';
import { RecentlyViewedRecorder } from '@/hooks/use-recently-viewed';

/**
 * /products/[handle]
 *
 * Rendered entirely from the local catalog: full product HTML reaches Google
 * and the customer without a single Shopify request. Live Shopify data is only
 * consulted when the customer transacts.
 */

// Statically generated at build, then kept fresh by webhook revalidation.
export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  const products = await productRepository.getAllProducts();
  return products.map((product) => ({ handle: product.handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = await productRepository.getProductByHandle(handle);
  if (!product) return { title: 'Product not found', robots: { index: false, follow: false } };
  return productMetadata(product);
}

export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params;
  const product = await productRepository.getProductByHandle(handle);

  if (!product) {
    // The handle may have changed in Shopify — follow the recorded rename.
    const current = await redirectRepository.resolveProduct(handle);
    if (current) permanentRedirect(`/products/${current}`);
    notFound();
  }

  const catalog = await productRepository.getAllProducts();
  const related = relatedProducts(product, catalog, 8);
  const complements = complementaryProducts(product, catalog, 3);

  const primaryCollection = product.collections[0];
  const crumbs = [
    { href: '/', label: 'Home' },
    ...(primaryCollection
      ? [{ href: `/collections/${primaryCollection.handle}`, label: primaryCollection.title }]
      : [{ href: '/collections', label: 'Shop' }]),
    { label: product.title },
  ];

  return (
    <>
      <JsonLd
        data={[
          productSchema(product),
          breadcrumbSchema([
            { name: 'Home', url: '/' },
            ...(primaryCollection
              ? [{ name: primaryCollection.title, url: `/collections/${primaryCollection.handle}` }]
              : []),
            { name: product.title, url: `/products/${product.handle}` },
          ]),
        ]}
      />
      <RecentlyViewedRecorder handle={product.handle} />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumb items={crumbs} />
        </div>

        <div id="buy-box" className="scroll-mt-24">
          <Suspense fallback={<BuyBoxSkeleton />}>
            <BuyBox product={product} />
          </Suspense>
        </div>

        <div className="mx-auto max-w-3xl lg:mx-0 lg:max-w-none lg:pr-[min(420px,35%)]">
          <ProductDetails product={product} />

          {complements.length > 0 && (
            <CompleteTheLook anchor={product} products={complements} />
          )}

          <Reviews product={product} />
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-20">
            <SectionHeading
              title="You may also like"
              className="mb-7"
              action={
                primaryCollection
                  ? { href: `/collections/${primaryCollection.handle}`, label: `All ${primaryCollection.title}` }
                  : undefined
              }
            />
            <h2 id="related-heading" className="sr-only">
              Related products
            </h2>
            <ProductGrid products={related} listName="Related products" priorityCount={0} />
          </section>
        )}

        <RecentlyViewedSection excludeHandle={product.handle} />
      </div>

      <StickyBuyBar product={product} />
    </>
  );
}

function BuyBoxSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:gap-12">
      <Skeleton className="aspect-[4/5] w-full rounded-lg" />
      <div className="space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-13 w-full" />
      </div>
    </div>
  );
}
