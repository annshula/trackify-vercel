import type { Metadata } from 'next';
import { Suspense } from 'react';

import { productRepository } from '@/lib/catalog';
import { bestSellersProxy } from '@/lib/catalog/recommendations';
import { parseProductQuery, countActiveFilters } from '@/lib/catalog/query-params';
import { noIndex } from '@/lib/seo/metadata';

import { Breadcrumb, EmptyState, SectionHeading } from '@/components/ui/primitives';
import { ButtonLink } from '@/components/ui/button';
import { ProductGrid } from '@/components/product/product-card';
import { ActiveFilterChips, FilterControls, FilterSidebar } from '@/components/collection/filter-panel';
import { Pagination } from '@/components/collection/pagination';
import { SearchIcon } from '@/components/ui/icons';

/**
 * /search
 *
 * Results come from the local catalog index — no Shopify request, and the
 * response is server-rendered so a shared search URL loads with its results
 * already in the HTML.
 */

export const metadata: Metadata = {
  title: 'Search',
  robots: noIndex,
};

// Query-dependent by definition.
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const rawTerm = Array.isArray(resolved.q) ? resolved.q[0] : resolved.q;
  const term = (rawTerm ?? '').trim().slice(0, 100);

  const query = parseProductQuery(resolved);
  query.sort = query.sort === 'newest' && !resolved.sort ? 'relevance' : query.sort;

  const activeCount = countActiveFilters(resolved);

  if (!term) {
    const popular = bestSellersProxy(await productRepository.getAllProducts(), 8);
    return (
      <div className="container-page">
        <div className="py-4">
          <Breadcrumb items={[{ href: '/', label: 'Home' }, { label: 'Search' }]} />
        </div>
        <EmptyState
          icon={<SearchIcon size={24} />}
          title="What are you looking for?"
          description="Search by product, brand, or category."
          action={<ButtonLink href="/collections">Browse everything</ButtonLink>}
        />
        {popular.length > 0 && (
          <section aria-labelledby="popular-heading" className="pb-8">
            <SectionHeading title="Popular right now" className="mb-7" />
            <h2 id="popular-heading" className="sr-only">
              Popular products
            </h2>
            <ProductGrid products={popular} listName="Popular" priorityCount={2} />
          </section>
        )}
      </div>
    );
  }

  const results = await productRepository.searchProducts(term, query);
  const products = results.hits.map((hit) => hit.product);

  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumb items={[{ href: '/', label: 'Home' }, { label: `Search: ${term}` }]} />
      </div>

      <header className="max-w-2xl pb-8">
        <h1 className="text-3xl">
          Results for <span className="italic">“{term}”</span>
        </h1>
        <p className="mt-2 text-sm text-ink-muted" aria-live="polite">
          {results.total} product{results.total === 1 ? '' : 's'} found
        </p>
      </header>

      {results.total === 0 ? (
        <NoResults term={term} />
      ) : (
        <>
          <Suspense fallback={null}>
            <FilterControls facets={results.facets} total={results.total} activeCount={activeCount} />
          </Suspense>

          <div className="flex gap-10">
            <Suspense fallback={null}>
              <FilterSidebar facets={results.facets} activeCount={activeCount} />
            </Suspense>

            <div className="min-w-0 flex-1">
              <Suspense fallback={null}>
                <ActiveFilterChips />
              </Suspense>

              {products.length === 0 ? (
                <EmptyState
                  title="No results with those filters"
                  description="Try removing a filter to see more."
                  action={
                    <ButtonLink href={`/search?q=${encodeURIComponent(term)}`} variant="outline">
                      Clear filters
                    </ButtonLink>
                  }
                />
              ) : (
                <>
                  <ProductGrid products={products} listName={`Search: ${term}`} />
                  <Pagination
                    page={query.page ?? 1}
                    totalPages={Math.ceil(results.total / (query.perPage ?? 24))}
                    basePath="/search"
                    searchParams={resolved}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** No-result state that recovers the visit instead of ending it. */
async function NoResults({ term }: { term: string }) {
  const products = await productRepository.getAllProducts();
  const suggestions = await productRepository.suggest(term.slice(0, 4), 4);
  const fallback = bestSellersProxy(products, 8);

  return (
    <div>
      <EmptyState
        icon={<SearchIcon size={24} />}
        title={`Nothing matched “${term}”`}
        description="Check the spelling, or try a broader word."
        action={<ButtonLink href="/collections">Browse everything</ButtonLink>}
      />

      {suggestions.terms.length > 0 && (
        <div className="mb-12 text-center">
          <p className="mb-3 text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">
            Did you mean
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {suggestions.terms.map((suggestion) => (
              <li key={suggestion}>
                <ButtonLink href={`/search?q=${encodeURIComponent(suggestion)}`} variant="outline" size="sm">
                  {suggestion}
                </ButtonLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fallback.length > 0 && (
        <section aria-labelledby="fallback-heading" className="pb-8">
          <SectionHeading title="Popular right now" className="mb-7" />
          <h2 id="fallback-heading" className="sr-only">
            Popular products
          </h2>
          <ProductGrid products={fallback} listName="Search fallback" priorityCount={0} />
        </section>
      )}
    </div>
  );
}
