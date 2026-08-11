import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { productRepository, redirectRepository } from '@/lib/catalog';
import { parseProductQuery, countActiveFilters } from '@/lib/catalog/query-params';
import { collectionMetadata } from '@/lib/seo/metadata';
import { JsonLd, breadcrumbSchema, collectionSchema } from '@/lib/seo/jsonld';

import { Breadcrumb, EmptyState, Skeleton } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/product-card';
import {
  ActiveFilterChips,
  FilterControls,
  FilterSidebar,
} from '@/components/collection/filter-panel';
import { Pagination } from '@/components/collection/pagination';
import { SearchIcon } from '@/components/ui/icons';

export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  const collections = await productRepository.getAllCollections();
  return collections.map((collection) => ({ handle: collection.handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const collection = await productRepository.getCollectionByHandle(handle);
  if (!collection) return { title: 'Collection not found', robots: { index: false, follow: false } };
  return collectionMetadata(collection, collection.productIds.length);
}

export default async function CollectionPage({ params, searchParams }: PageProps) {
  const { handle } = await params;
  const resolvedSearchParams = await searchParams;

  const collection = await productRepository.getCollectionByHandle(handle);
  if (!collection) {
    const current = await redirectRepository.resolveCollection(handle);
    if (current) permanentRedirect(`/collections/${current}`);
    notFound();
  }

  const query = parseProductQuery(resolvedSearchParams);
  const page = await productRepository.getProductsByCollection(handle, query);
  const activeCount = countActiveFilters(resolvedSearchParams);

  return (
    <>
      <JsonLd
        data={[
          collectionSchema(collection, page.products),
          breadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Shop', url: '/collections' },
            { name: collection.title, url: `/collections/${collection.handle}` },
          ]),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumb
            items={[
              { href: '/', label: 'Home' },
              { href: '/collections', label: 'Shop' },
              { label: collection.title },
            ]}
          />
        </div>

        <header className="max-w-2xl pb-8">
          <h1 className="text-4xl">{collection.title}</h1>
          {collection.description && (
            <p className="mt-3 text-base leading-relaxed text-ink-muted">{collection.description}</p>
          )}
          <p className="mt-3 text-sm text-ink-subtle" aria-live="polite">
            {page.total} product{page.total === 1 ? '' : 's'}
            {activeCount > 0 && ` matching ${activeCount} filter${activeCount === 1 ? '' : 's'}`}
          </p>
        </header>

        <Suspense fallback={<ListingSkeleton />}>
          <FilterControls facets={page.facets} total={page.total} activeCount={activeCount} />
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
                icon={<SearchIcon size={24} />}
                title={activeCount > 0 ? 'Nothing matches those filters' : 'This collection is empty'}
                description={
                  activeCount > 0
                    ? 'Try removing a filter, or widen your price range.'
                    : 'Check back soon — new pieces are added regularly.'
                }
                action={
                  activeCount > 0 ? (
                    <ButtonLink href={`/collections/${collection.handle}`} variant="outline">
                      Clear all filters
                    </ButtonLink>
                  ) : (
                    <ButtonLink href="/collections">Browse all collections</ButtonLink>
                  )
                }
              />
            ) : (
              <>
                <ProductGrid products={page.products} listName={collection.title} />
                <Pagination
                  page={page.page}
                  totalPages={page.totalPages}
                  basePath={`/collections/${collection.handle}`}
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

function ListingSkeleton() {
  return (
    <div className="mb-5 flex gap-2 lg:hidden">
      <Skeleton className="h-11 flex-1 rounded-md" />
      <Skeleton className="h-11 flex-1 rounded-md" />
    </div>
  );
}
