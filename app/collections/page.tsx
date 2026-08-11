import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";

import { productRepository } from "@/lib/catalog";
import {
  parseProductQuery,
  countActiveFilters,
} from "@/lib/catalog/query-params";
import { JsonLd, breadcrumbSchema } from "@/lib/seo/jsonld";

import {
  Breadcrumb,
  EmptyState,
  SectionHeading,
} from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-card";
import {
  ActiveFilterChips,
  FilterControls,
  FilterSidebar,
} from "@/components/collection/filter-panel";
import { Pagination } from "@/components/collection/pagination";
import { DragScroll } from "@/components/ui/drag-scroll";
import { GridIcon } from "@/components/ui/icons";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Shop all",
  description: "Browse every collection and product in the store.",
  alternates: { canonical: "/collections" },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CollectionsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const query = parseProductQuery(resolvedSearchParams);

  const [collections, page] = await Promise.all([
    productRepository.getAllCollections(),
    productRepository.queryProducts(query),
  ]);

  const activeCount = countActiveFilters(resolvedSearchParams);
  const populated = collections.filter(
    (collection) => collection.productIds.length > 0,
  );

  if (page.total === 0 && activeCount === 0) {
    return (
      <div className="container-page">
        <EmptyState
          icon={<GridIcon size={24} />}
          title="Nothing to show yet"
          description="Run the catalog sync to bring your Shopify products into the storefront."
          action={<ButtonLink href="/">Back home</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "Shop", url: "/collections" },
        ])}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumb
            items={[{ href: "/", label: "Home" }, { label: "Shop" }]}
          />
        </div>

        <header className="max-w-2xl pb-8">
          <h1 className="text-4xl">Shop everything</h1>
          <p className="mt-3 text-base text-ink-muted">
            {page.total} product{page.total === 1 ? "" : "s"} across{" "}
            {populated.length} collection
            {populated.length === 1 ? "" : "s"}.
          </p>
        </header>

        {populated.length > 0 && (
          <section aria-labelledby="all-collections-heading" className="mb-12">
            <SectionHeading title="Collections" className="mb-5" />
            <h2 id="all-collections-heading" className="sr-only">
              All collections
            </h2>
            <DragScroll
              as="ul"
              className="hide-scrollbar flex snap-x gap-3 overflow-x-auto pb-2"
            >
              {populated.map((collection) => {
                const image = collection.image;
                return (
                  <li
                    key={collection.id}
                    className="w-44 shrink-0 snap-start sm:w-52"
                  >
                    <Link
                      href={`/collections/${collection.handle}`}
                      className="group block overflow-hidden rounded-lg bg-surface-sunken"
                    >
                      <span className="relative block aspect-4/3">
                        {image && (
                          <Image
                            src={image.url}
                            alt=""
                            fill
                            sizes="208px"
                            // Collection cards sit above the fold — load eagerly.
                            loading="eager"
                            className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
                          />
                        )}
                      </span>
                      <span className="block px-3.5 py-3">
                        <span className="block truncate text-sm font-medium">
                          {collection.title}
                        </span>
                        <span className="block text-xs text-ink-subtle">
                          {collection.productIds.length} item
                          {collection.productIds.length === 1 ? "" : "s"}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </DragScroll>
          </section>
        )}

        <Suspense fallback={null}>
          <FilterControls
            facets={page.facets}
            total={page.total}
            activeCount={activeCount}
          />
        </Suspense>

        <div className="flex gap-10">
          <Suspense fallback={null}>
            <FilterSidebar facets={page.facets} activeCount={activeCount} />
          </Suspense>

          <div className="min-w-0 flex-1">
            <Suspense fallback={null}>
              <ActiveFilterChips />
            </Suspense>

            {page.products.length === 0 ? (
              <EmptyState
                title="Nothing matches those filters"
                description="Try removing a filter or widening your price range."
                action={
                  <ButtonLink href="/collections" variant="outline">
                    Clear all filters
                  </ButtonLink>
                }
              />
            ) : (
              <>
                <ProductGrid products={page.products} listName="All products" />
                <Pagination
                  page={page.page}
                  totalPages={page.totalPages}
                  basePath="/collections"
                  searchParams={resolvedSearchParams}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
