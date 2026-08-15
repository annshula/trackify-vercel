import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";

import { productRepository, redirectRepository } from "@/lib/catalog";
import {
  relatedProducts,
  complementaryProducts,
} from "@/lib/catalog/recommendations";
import { productMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbSchema, productSchema } from "@/lib/seo/jsonld";

import {
  Breadcrumb,
  SectionHeading,
  Skeleton,
} from "@/components/ui/primitives";
import { BuyBox } from "@/components/product/buy-box";
import { ProductDetails } from "@/components/product/product-details";
import { Reviews } from "@/components/product/reviews";
import { ProductGrid } from "@/components/product/product-card";
import { CompleteTheLook } from "@/components/product/complete-the-look";
import { RecentlyViewedSection } from "@/components/product/recently-viewed-section";
import { RecentlyViewedRecorder } from "@/hooks/use-recently-viewed";

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = await productRepository.getProductByHandle(handle);
  if (!product)
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
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
    { href: "/", label: "Home" },
    ...(primaryCollection
      ? [
          {
            href: `/collections/${primaryCollection.handle}`,
            label: primaryCollection.title,
          },
        ]
      : [{ href: "/collections", label: "Shop" }]),
    { label: product.title },
  ];

  return (
    <>
      <JsonLd
        data={[
          productSchema(product),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            ...(primaryCollection
              ? [
                  {
                    name: primaryCollection.title,
                    url: `/collections/${primaryCollection.handle}`,
                  },
                ]
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
          <Suspense
            fallback={
              <BuyBoxSkeleton title={product.title} vendor={product.vendor} />
            }
          >
            <BuyBox product={product} />
          </Suspense>
        </div>

        {/* Detail content sits under the gallery column rather than spanning
            the full width — a measure that stays readable instead of running
            long lines across the page. */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <div className="lg:col-span-7">
            <ProductDetails product={product} />

            {complements.length > 0 && (
              <CompleteTheLook anchor={product} products={complements} />
            )}

            <Reviews product={product} />
          </div>
        </div>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-20">
            <SectionHeading
              title="You may also like"
              className="mb-7"
              action={
                primaryCollection
                  ? {
                      href: `/collections/${primaryCollection.handle}`,
                      label: `All ${primaryCollection.title}`,
                    }
                  : undefined
              }
            />
            <h2 id="related-heading" className="sr-only">
              Related products
            </h2>
            <ProductGrid
              products={related}
              listName="Related products"
              priorityCount={0}
            />
          </section>
        )}

        <RecentlyViewedSection excludeHandle={product.handle} />
      </div>
    </>
  );
}

/**
 * Mirrors the real BuyBox proportions so nothing shifts when it swaps in.
 *
 * BuyBox is a client component gated on useSearchParams(), so Next.js ships
 * this fallback — not BuyBox's own markup — in the static/prerendered HTML
 * that crawlers see. The title and vendor are real server-rendered text
 * (not skeleton bars) so every product page has a proper H1 before
 * hydration ever runs.
 */
function BuyBoxSkeleton({
  title,
  vendor,
}: {
  title: string;
  vendor?: string | null;
}) {
  return (
    <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
      <div className="-mx-4 sm:-mx-6 lg:col-span-7 lg:mx-0">
        <Skeleton className="h-[min(92vw,360px)] w-full lg:h-125 lg:rounded-2xl" />
      </div>
      <div className="space-y-4 px-4 pt-7 sm:px-6 lg:col-span-5 lg:px-0 lg:pt-0">
        {vendor && (
          <p className="text-2xs font-semibold tracking-[0.2em] text-ink-subtle uppercase">
            {vendor}
          </p>
        )}
        <h1 className="font-display text-3xl leading-[1.1] tracking-tight text-balance">
          {title}
        </h1>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-7 w-48 rounded-full" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}
