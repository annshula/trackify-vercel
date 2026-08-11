import type { Catalog, CatalogCollection, CatalogProduct, CatalogVariant } from '@/types/catalog';

/** Test data builders. Defaults produce a valid, purchasable product. */

let counter = 0;
const nextId = () => (counter += 1);

export function makeVariant(overrides: Partial<CatalogVariant> = {}): CatalogVariant {
  const id = nextId();
  return {
    id: `gid://shopify/ProductVariant/${1000 + id}`,
    title: 'Default Title',
    sku: `SKU-${id}`,
    barcode: null,
    price: 49.99,
    compareAtPrice: null,
    currencyCode: 'USD',
    selectedOptions: [{ name: 'Title', value: 'Default Title' }],
    imageId: null,
    availableForSale: true,
    inventoryQuantity: 25,
    inventoryPolicy: 'DENY',
    requiresShipping: true,
    weight: null,
    weightUnit: null,
    position: 1,
    ...overrides,
  };
}

export function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  const id = nextId();
  const handle = overrides.handle ?? `test-product-${id}`;
  const variants = overrides.variants ?? [makeVariant()];
  const prices = variants.map((variant) => variant.price);

  return {
    id: `gid://shopify/Product/${2000 + id}`,
    handle,
    title: `Test Product ${id}`,
    description: 'A test product used by the suite.',
    descriptionHtml: '<p>A test product used by the suite.</p>',
    vendor: 'Test Vendor',
    productType: 'Test Type',
    tags: ['test'],
    collections: [],
    images: [],
    media: [],
    seo: { title: null, description: null },
    status: 'ACTIVE',
    publishedOnline: true,
    publishedAt: '2025-01-01T00:00:00.000Z',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    options: [{ id: `gid://shopify/ProductOption/${id}`, name: 'Title', position: 1, values: ['Default Title'] }],
    variants,
    priceRange: { min: Math.min(...prices), max: Math.max(...prices), currencyCode: 'USD' },
    compareAtPriceRange: null,
    metafields: {},
    totalInventory: 25,
    ...overrides,
  };
}

export function makeCollection(overrides: Partial<CatalogCollection> = {}): CatalogCollection {
  const id = nextId();
  return {
    id: `gid://shopify/Collection/${3000 + id}`,
    handle: overrides.handle ?? `test-collection-${id}`,
    title: `Test Collection ${id}`,
    description: '',
    descriptionHtml: '',
    image: null,
    seo: { title: null, description: null },
    updatedAt: '2025-01-02T00:00:00.000Z',
    productIds: [],
    sortOrder: null,
    ...overrides,
  };
}

export function makeCatalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    version: 1,
    generatedAt: '2025-01-02T00:00:00.000Z',
    shop: { domain: 'test-store.myshopify.com', name: 'Test Store', currencyCode: 'USD' },
    products: [],
    collections: [],
    ...overrides,
  };
}
