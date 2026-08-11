import { describe, expect, it } from 'vitest';
import { auditCatalog, catalogSchema, validateCatalog } from '@/lib/catalog/schema';
import { applyFilters, buildFacets, sortProducts } from '@/lib/catalog/json-repository';
import { searchCatalog, suggestTerms, tokenize } from '@/lib/catalog/search';
import { relatedProducts } from '@/lib/catalog/recommendations';
import {
  availableValuesFor,
  defaultVariant,
  findVariantByOptions,
  lowStockCount,
  productRating,
} from '@/lib/catalog/selectors';
import { discountPercent, formatMoney } from '@/lib/utils/money';
import { makeCatalog, makeCollection, makeProduct, makeVariant } from './factories';

describe('catalog schema', () => {
  it('accepts a well-formed catalog', () => {
    const catalog = makeCatalog({ products: [makeProduct()] });
    expect(validateCatalog(catalog).ok).toBe(true);
  });

  it('rejects a handle that is not Shopify-shaped', () => {
    // A bad handle would produce an unreachable or duplicated product URL.
    const catalog = makeCatalog({ products: [makeProduct({ handle: 'Not A Handle' })] });
    const result = validateCatalog(catalog);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((issue) => issue.path.includes('handle'))).toBe(true);
  });

  it('rejects a product with no variants', () => {
    const catalog = makeCatalog({ products: [makeProduct({ variants: [] })] });
    expect(validateCatalog(catalog).ok).toBe(false);
  });

  it('rejects a negative price', () => {
    const catalog = makeCatalog({
      products: [makeProduct({ variants: [makeVariant({ price: -1 })] })],
    });
    expect(validateCatalog(catalog).ok).toBe(false);
  });
});

describe('catalog audit', () => {
  it('flags duplicate handles, which would collide on one URL', () => {
    const catalog = catalogSchema.parse(
      makeCatalog({
        products: [makeProduct({ handle: 'same-handle' }), makeProduct({ handle: 'same-handle' })],
      }),
    );
    const issues = auditCatalog(catalog);
    expect(issues.some((issue) => issue.message.includes('Duplicate handle'))).toBe(true);
  });

  it('flags a variant pointing at an image the product does not have', () => {
    const catalog = catalogSchema.parse(
      makeCatalog({
        products: [makeProduct({ variants: [makeVariant({ imageId: 'gid://shopify/MediaImage/missing' })] })],
      }),
    );
    expect(auditCatalog(catalog).some((issue) => issue.message.includes('does not exist'))).toBe(true);
  });

  it('flags a compare-at price below the price', () => {
    const catalog = catalogSchema.parse(
      makeCatalog({
        products: [makeProduct({ variants: [makeVariant({ price: 100, compareAtPrice: 50 })] })],
      }),
    );
    expect(auditCatalog(catalog).some((issue) => issue.message.includes('compareAtPrice'))).toBe(true);
  });

  it('flags a collection referencing an unknown product', () => {
    const catalog = catalogSchema.parse(
      makeCatalog({
        products: [makeProduct()],
        collections: [makeCollection({ productIds: ['gid://shopify/Product/999999'] })],
      }),
    );
    expect(auditCatalog(catalog).some((issue) => issue.message.includes('unknown product'))).toBe(true);
  });

  it('reports nothing for a clean catalog', () => {
    const product = makeProduct();
    const catalog = catalogSchema.parse(
      makeCatalog({
        products: [product],
        collections: [makeCollection({ productIds: [product.id] })],
      }),
    );
    expect(auditCatalog(catalog)).toEqual([]);
  });
});

describe('search', () => {
  const products = [
    makeProduct({ handle: 'merino-wool-scarf', title: 'Merino Wool Scarf', productType: 'Scarves', vendor: 'Northwind' }),
    makeProduct({ handle: 'cashmere-scarf', title: 'Cashmere Scarf', productType: 'Scarves', vendor: 'Aurelia' }),
    makeProduct({ handle: 'leather-boots', title: 'Leather Chelsea Boots', productType: 'Footwear', vendor: 'Northwind' }),
  ];

  it('tokenizes and strips accents', () => {
    expect(tokenize('Café  Crème!')).toEqual(['cafe', 'creme']);
  });

  it('finds an exact title match first', () => {
    const hits = searchCatalog(products, 'cashmere scarf');
    expect(hits[0]?.product.handle).toBe('cashmere-scarf');
  });

  it('matches on a prefix', () => {
    const hits = searchCatalog(products, 'meri');
    expect(hits.some((hit) => hit.product.handle === 'merino-wool-scarf')).toBe(true);
  });

  it('tolerates a single-character typo', () => {
    const hits = searchCatalog(products, 'cashmeer');
    expect(hits.some((hit) => hit.product.handle === 'cashmere-scarf')).toBe(true);
  });

  it('matches on vendor', () => {
    const hits = searchCatalog(products, 'northwind');
    expect(hits).toHaveLength(2);
  });

  it('matches on SKU', () => {
    const sku = products[0]!.variants[0]!.sku!;
    expect(searchCatalog(products, sku)[0]?.product.handle).toBe('merino-wool-scarf');
  });

  it('returns nothing for an unrelated query', () => {
    expect(searchCatalog(products, 'refrigerator')).toHaveLength(0);
  });

  it('returns nothing for an empty query', () => {
    expect(searchCatalog(products, '   ')).toHaveLength(0);
  });

  it('suggests only real catalog vocabulary', () => {
    const terms = suggestTerms(products, 'scar');
    expect(terms).toContain('Scarves');
    expect(terms.every((term) => term.toLowerCase().startsWith('scar'))).toBe(true);
  });
});

describe('filtering and sorting', () => {
  const cheap = makeProduct({ handle: 'cheap', variants: [makeVariant({ price: 10 })] });
  const mid = makeProduct({ handle: 'mid', variants: [makeVariant({ price: 50 })] });
  const expensive = makeProduct({
    handle: 'expensive',
    variants: [makeVariant({ price: 200, availableForSale: false })],
  });
  const products = [cheap, mid, expensive];

  it('filters by minimum price', () => {
    const result = applyFilters(products, { filters: { minPrice: 40 } });
    expect(result.map((p) => p.handle).sort()).toEqual(['expensive', 'mid']);
  });

  it('filters by maximum price', () => {
    const result = applyFilters(products, { filters: { maxPrice: 50 } });
    expect(result.map((p) => p.handle).sort()).toEqual(['cheap', 'mid']);
  });

  it('filters to in-stock only', () => {
    const result = applyFilters(products, { filters: { inStockOnly: true } });
    expect(result.map((p) => p.handle)).not.toContain('expensive');
  });

  it('filters on-sale only using a real markdown', () => {
    const onSale = makeProduct({
      handle: 'reduced',
      variants: [makeVariant({ price: 30, compareAtPrice: 60 })],
    });
    const result = applyFilters([...products, onSale], { filters: { onSaleOnly: true } });
    expect(result.map((p) => p.handle)).toEqual(['reduced']);
  });

  it('sorts by price ascending', () => {
    expect(sortProducts(products, 'price-asc').map((p) => p.handle)).toEqual([
      'cheap',
      'mid',
      'expensive',
    ]);
  });

  it('sorts by price descending', () => {
    expect(sortProducts(products, 'price-desc').map((p) => p.handle)).toEqual([
      'expensive',
      'mid',
      'cheap',
    ]);
  });

  it('leaves order untouched for relevance sorting', () => {
    expect(sortProducts(products, 'relevance').map((p) => p.handle)).toEqual([
      'cheap',
      'mid',
      'expensive',
    ]);
  });
});

describe('facets', () => {
  it('counts each option value once per product, not per variant', () => {
    const product = makeProduct({
      options: [{ id: 'o1', name: 'Size', position: 1, values: ['S', 'M', 'L'] }],
      variants: [
        makeVariant({ selectedOptions: [{ name: 'Size', value: 'S' }] }),
        makeVariant({ selectedOptions: [{ name: 'Size', value: 'M' }] }),
        makeVariant({ selectedOptions: [{ name: 'Size', value: 'L' }] }),
      ],
    });

    const facets = buildFacets([product]);
    const size = facets.options.find((option) => option.name === 'Size');
    expect(size?.values.every((value) => value.count === 1)).toBe(true);
  });

  it('derives price bounds from the whole set', () => {
    const facets = buildFacets([
      makeProduct({ variants: [makeVariant({ price: 12.5 })] }),
      makeProduct({ variants: [makeVariant({ price: 300 })] }),
    ]);
    expect(facets.priceBounds.min).toBe(12);
    expect(facets.priceBounds.max).toBe(300);
  });

  it('returns an empty shape for no products', () => {
    expect(buildFacets([]).productTypes).toEqual([]);
  });
});

describe('variant selectors', () => {
  const product = makeProduct({
    options: [
      { id: 'o1', name: 'Color', position: 1, values: ['Black', 'Sand'] },
      { id: 'o2', name: 'Size', position: 2, values: ['S', 'M'] },
    ],
    variants: [
      makeVariant({
        selectedOptions: [{ name: 'Color', value: 'Black' }, { name: 'Size', value: 'S' }],
        availableForSale: true,
      }),
      makeVariant({
        selectedOptions: [{ name: 'Color', value: 'Black' }, { name: 'Size', value: 'M' }],
        availableForSale: false,
      }),
      makeVariant({
        selectedOptions: [{ name: 'Color', value: 'Sand' }, { name: 'Size', value: 'M' }],
        availableForSale: true,
      }),
    ],
  });

  it('finds a variant by its full option selection', () => {
    const variant = findVariantByOptions(product, { Color: 'Black', Size: 'S' });
    expect(variant?.availableForSale).toBe(true);
  });

  it('returns null for a combination that does not exist', () => {
    expect(findVariantByOptions(product, { Color: 'Sand', Size: 'S' })).toBeNull();
  });

  it('reports which sizes are purchasable for the chosen color', () => {
    expect(availableValuesFor(product, 'Size', { Color: 'Black' })).toEqual(new Set(['S']));
    expect(availableValuesFor(product, 'Size', { Color: 'Sand' })).toEqual(new Set(['M']));
  });

  it('prefers an available variant as the default', () => {
    const soldOutFirst = makeProduct({
      variants: [makeVariant({ availableForSale: false }), makeVariant({ availableForSale: true })],
    });
    expect(defaultVariant(soldOutFirst)?.availableForSale).toBe(true);
  });

  it('shows low stock only inside the threshold', () => {
    expect(lowStockCount(makeVariant({ inventoryQuantity: 3 }))).toBe(3);
    expect(lowStockCount(makeVariant({ inventoryQuantity: 40 }))).toBeNull();
    expect(lowStockCount(makeVariant({ inventoryQuantity: 0 }))).toBeNull();
  });

  it('never reports low stock when overselling is allowed', () => {
    expect(lowStockCount(makeVariant({ inventoryQuantity: 2, inventoryPolicy: 'CONTINUE' }))).toBeNull();
  });

  it('returns no rating when the store publishes none', () => {
    expect(productRating(makeProduct())).toBeNull();
  });

  it('reads a rating from a Shopify rating metafield', () => {
    const rated = makeProduct({
      metafields: {
        'reviews.rating': '{"value":"4.6","scale_min":"1.0","scale_max":"5.0"}',
        'reviews.rating_count': '128',
      },
    });
    expect(productRating(rated)).toEqual({ value: 4.6, count: 128 });
  });
});

describe('recommendations', () => {
  it('ranks products sharing a collection above unrelated ones', () => {
    const shared = { id: 'gid://shopify/Collection/1', handle: 'knitwear', title: 'Knitwear' };
    const anchor = makeProduct({ handle: 'anchor', collections: [shared], productType: 'Scarves' });
    const sibling = makeProduct({ handle: 'sibling', collections: [shared], productType: 'Scarves' });
    const unrelated = makeProduct({ handle: 'unrelated', productType: 'Footwear', vendor: 'Other' });

    const related = relatedProducts(anchor, [anchor, sibling, unrelated]);
    expect(related[0]?.handle).toBe('sibling');
  });

  it('never recommends the anchor product itself', () => {
    const anchor = makeProduct({ handle: 'anchor' });
    expect(relatedProducts(anchor, [anchor]).map((p) => p.handle)).not.toContain('anchor');
  });
});

describe('money', () => {
  it('formats with the store currency', () => {
    expect(formatMoney(49.99, 'USD')).toBe('$49.99');
  });

  it('trims zero cents when asked', () => {
    expect(formatMoney(50, 'USD', { trimZeroCents: true })).toBe('$50');
  });

  it('falls back rather than throwing on an unknown currency', () => {
    expect(formatMoney(10, 'XYZ')).toContain('10');
  });

  it('computes a discount percentage', () => {
    expect(discountPercent(75, 100)).toBe(25);
  });

  it('reports no discount when compare-at is not above price', () => {
    expect(discountPercent(100, 100)).toBeNull();
    expect(discountPercent(100, 80)).toBeNull();
    expect(discountPercent(100, null)).toBeNull();
  });
});
