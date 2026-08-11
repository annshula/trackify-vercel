import { describe, expect, it } from 'vitest';
import { collectionMetadata, productMetadata, absoluteUrl } from '@/lib/seo/metadata';
import { breadcrumbSchema, collectionSchema, organizationSchema, productSchema, websiteSchema } from '@/lib/seo/jsonld';
import { buildSearchParams, countActiveFilters, parseProductQuery } from '@/lib/catalog/query-params';
import { makeCollection, makeProduct, makeVariant } from './factories';

describe('metadata', () => {
  it('prefers the Shopify SEO title when the merchant set one', () => {
    const product = makeProduct({ title: 'Product Title', seo: { title: 'SEO Title', description: null } });
    expect(productMetadata(product).title).toBe('SEO Title');
  });

  it('falls back to the product title', () => {
    const product = makeProduct({ title: 'Product Title' });
    expect(productMetadata(product).title).toBe('Product Title');
  });

  it('canonicalizes to the current handle', () => {
    const product = makeProduct({ handle: 'premium-watch' });
    expect(productMetadata(product).alternates?.canonical).toBe('/products/premium-watch');
  });

  it('truncates an over-long description', () => {
    const product = makeProduct({ description: 'x'.repeat(500) });
    const description = productMetadata(product).description ?? '';
    expect(description.length).toBeLessThanOrEqual(160);
  });

  it('reports real availability in the product metadata', () => {
    const soldOut = makeProduct({ variants: [makeVariant({ availableForSale: false })] });
    expect(productMetadata(soldOut).other?.['product:availability']).toBe('out of stock');
  });

  it('canonicalizes collections to their handle', () => {
    const collection = makeCollection({ handle: 'knitwear' });
    expect(collectionMetadata(collection, 12).alternates?.canonical).toBe('/collections/knitwear');
  });

  it('builds absolute URLs from the configured site URL', () => {
    expect(absoluteUrl('/products/x')).toBe('https://example.test/products/x');
    expect(absoluteUrl('products/x')).toBe('https://example.test/products/x');
  });
});

describe('structured data', () => {
  it('emits a Product with a single Offer for a one-variant product', () => {
    const schema = productSchema(makeProduct({ variants: [makeVariant({ price: 49.99 })] })) as unknown as Record<string, { '@type': string; price?: string }>;
    expect(schema['@type']).toBe('Product');
    expect(schema.offers?.['@type']).toBe('Offer');
    expect(schema.offers?.price).toBe('49.99');
  });

  it('emits an AggregateOffer for a multi-variant product', () => {
    const product = makeProduct({
      variants: [makeVariant({ price: 20 }), makeVariant({ price: 40 })],
    });
    const schema = productSchema(product) as unknown as Record<string, { '@type': string; lowPrice?: string; highPrice?: string }>;
    expect(schema.offers?.['@type']).toBe('AggregateOffer');
    expect(schema.offers?.lowPrice).toBe('20.00');
    expect(schema.offers?.highPrice).toBe('40.00');
  });

  it('marks a sold-out product OutOfStock', () => {
    const product = makeProduct({ variants: [makeVariant({ availableForSale: false })] });
    const schema = productSchema(product) as unknown as Record<string, { availability?: string }>;
    expect(schema.offers?.availability).toBe('https://schema.org/OutOfStock');
  });

  it('omits aggregateRating when the store publishes no review data', () => {
    // Emitting a fabricated rating is a structured-data violation.
    expect(productSchema(makeProduct())).not.toHaveProperty('aggregateRating');
  });

  it('includes aggregateRating only when a real rating exists', () => {
    const rated = makeProduct({
      metafields: { 'reviews.rating': '4.5', 'reviews.rating_count': '20' },
    });
    const schema = productSchema(rated) as unknown as Record<string, { ratingValue?: string; reviewCount?: number }>;
    expect(schema.aggregateRating?.ratingValue).toBe('4.5');
    expect(schema.aggregateRating?.reviewCount).toBe(20);
  });

  it('numbers breadcrumb positions from 1 and absolutizes URLs', () => {
    const schema = breadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Shop', url: '/collections' },
    ]) as unknown as { itemListElement: { position: number; item: string }[] };

    expect(schema.itemListElement[0]?.position).toBe(1);
    expect(schema.itemListElement[1]?.item).toBe('https://example.test/collections');
  });

  it('emits a WebSite with a SearchAction target', () => {
    const schema = websiteSchema() as unknown as { potentialAction: { target: { urlTemplate: string } } };
    expect(schema.potentialAction.target.urlTemplate).toContain('/search?q=');
  });

  it('emits an Organization with a stable @id', () => {
    expect((organizationSchema() as unknown as { '@id': string })['@id']).toBe('https://example.test/#organization');
  });

  it('lists collection members as an ItemList', () => {
    const products = [makeProduct(), makeProduct()];
    const schema = collectionSchema(makeCollection(), products) as unknown as {
      mainEntity: { numberOfItems: number; itemListElement: unknown[] };
    };
    expect(schema.mainEntity.numberOfItems).toBe(2);
    expect(schema.mainEntity.itemListElement).toHaveLength(2);
  });
});

describe('query params', () => {
  it('defaults to newest, page 1', () => {
    const query = parseProductQuery({});
    expect(query.sort).toBe('newest');
    expect(query.page).toBe(1);
  });

  it('ignores an unknown sort value', () => {
    expect(parseProductQuery({ sort: 'drop-tables' }).sort).toBe('newest');
  });

  it('parses comma-separated filter values', () => {
    const query = parseProductQuery({ type: 'scarves,hats' });
    expect(query.filters?.productTypes).toEqual(['scarves', 'hats']);
  });

  it('treats unreserved keys as option filters', () => {
    expect(parseProductQuery({ color: 'black,sand' }).filters?.options).toEqual({
      color: ['black', 'sand'],
    });
  });

  it('ignores a non-numeric price bound rather than filtering to nothing', () => {
    expect(parseProductQuery({ min: 'abc' }).filters?.minPrice).toBeUndefined();
  });

  it('clamps a negative page to 1', () => {
    expect(parseProductQuery({ page: '-5' }).page).toBe(1);
  });

  it('resets pagination when a filter changes', () => {
    const current = new URLSearchParams('page=3&sort=newest');
    const next = buildSearchParams(current, { type: 'scarves' });
    expect(next.get('page')).toBeNull();
    expect(next.get('type')).toBe('scarves');
  });

  it('keeps pagination when the page itself is what changed', () => {
    const next = buildSearchParams(new URLSearchParams('type=scarves'), { page: '2' });
    expect(next.get('page')).toBe('2');
  });

  it('removes a param when set to null', () => {
    expect(buildSearchParams(new URLSearchParams('type=scarves'), { type: null }).get('type')).toBeNull();
  });

  it('counts active filters without counting sort or pagination', () => {
    expect(countActiveFilters({ sort: 'newest', page: '2', type: 'a,b', stock: 'in' })).toBe(3);
  });
});
