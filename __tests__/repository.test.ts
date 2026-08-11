import { describe, expect, it, beforeEach, afterAll, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * Repository tests run against a real temp directory rather than a mocked fs,
 * because the behaviour under test *is* the file handling: atomic writes,
 * concurrent mutation, and reload-after-write.
 */
const TEMP_DIR = await fs.mkdtemp(path.join(os.tmpdir(), 'trackify-repo-'));
const CATALOG_PATH = path.join(TEMP_DIR, 'products.json');
const REDIRECTS_PATH = path.join(TEMP_DIR, 'redirects.json');

vi.mock('@/lib/catalog/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/catalog/storage')>('@/lib/catalog/storage');
  return { ...actual, CATALOG_PATH, REDIRECTS_PATH, DATA_DIR: TEMP_DIR };
});

const { JsonProductRepository, JsonRedirectRepository } = await import('@/lib/catalog/json-repository');
const { makeCatalog, makeCollection, makeProduct, makeVariant } = await import('./factories');

afterAll(async () => {
  await fs.rm(TEMP_DIR, { recursive: true, force: true });
});

describe('JsonProductRepository', () => {
  let repo: InstanceType<typeof JsonProductRepository>;

  beforeEach(async () => {
    await fs.rm(CATALOG_PATH, { force: true });
    repo = new JsonProductRepository();
  });

  it('returns an empty catalog when no file exists yet', async () => {
    expect(await repo.getAllProducts()).toEqual([]);
  });

  it('round-trips a catalog through disk', async () => {
    const product = makeProduct({ handle: 'round-trip' });
    await repo.replaceCatalog(makeCatalog({ products: [product] }));

    const fresh = new JsonProductRepository();
    expect((await fresh.getProductByHandle('round-trip'))?.id).toBe(product.id);
  });

  it('writes valid JSON, not a truncated file', async () => {
    await repo.replaceCatalog(makeCatalog({ products: [makeProduct()] }));
    const raw = await fs.readFile(CATALOG_PATH, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('hides an unpublished product from the storefront', async () => {
    await repo.replaceCatalog(
      makeCatalog({ products: [makeProduct({ handle: 'draft-item', status: 'DRAFT' })] }),
    );
    expect(await repo.getProductByHandle('draft-item')).toBeNull();
    // Diagnostics can still see it.
    expect(await repo.getAllProducts({ includeUnavailable: true })).toHaveLength(1);
  });

  it('hides a product that is active but not published online', async () => {
    await repo.replaceCatalog(
      makeCatalog({ products: [makeProduct({ handle: 'hidden', publishedOnline: false })] }),
    );
    expect(await repo.getProductByHandle('hidden')).toBeNull();
  });

  it('upserts a product', async () => {
    const product = makeProduct({ handle: 'upsert-me', title: 'Before' });
    await repo.replaceCatalog(makeCatalog({ products: [product] }));

    await repo.updateProduct({ ...product, title: 'After', updatedAt: '2025-06-01T00:00:00.000Z' });
    expect((await repo.getProductByHandle('upsert-me'))?.title).toBe('After');
  });

  it('ignores an out-of-order update that is older than what we hold', async () => {
    const product = makeProduct({ handle: 'ordered', title: 'Newer', updatedAt: '2025-06-01T00:00:00.000Z' });
    await repo.replaceCatalog(makeCatalog({ products: [product] }));

    // A delayed webhook delivering older data must not revert the record.
    await repo.updateProduct({ ...product, title: 'Older', updatedAt: '2025-01-01T00:00:00.000Z' });
    expect((await repo.getProductByHandle('ordered'))?.title).toBe('Newer');
  });

  it('deletes a product and cleans its collection membership', async () => {
    const product = makeProduct({ handle: 'doomed' });
    const collection = makeCollection({ productIds: [product.id] });
    await repo.replaceCatalog(makeCatalog({ products: [product], collections: [collection] }));

    expect(await repo.deleteProduct(product.id)).toBe(true);
    expect(await repo.getProductByHandle('doomed')).toBeNull();

    const collections = await repo.getAllCollections();
    expect(collections[0]?.productIds).toEqual([]);
  });

  it('reports false when deleting something that is already gone', async () => {
    await repo.replaceCatalog(makeCatalog());
    expect(await repo.deleteProduct('gid://shopify/Product/does-not-exist')).toBe(false);
  });

  it('survives concurrent writes without losing a record', async () => {
    await repo.replaceCatalog(makeCatalog());

    const products = Array.from({ length: 12 }, (_, index) =>
      makeProduct({ handle: `concurrent-${index}` }),
    );
    // The mutex must serialize these read-modify-write cycles.
    await Promise.all(products.map((product) => repo.updateProduct(product)));

    const fresh = new JsonProductRepository();
    expect(await fresh.getAllProducts()).toHaveLength(12);
  });

  it('paginates a collection listing', async () => {
    const products = Array.from({ length: 30 }, (_, index) => makeProduct({ handle: `p-${index}` }));
    const collection = makeCollection({
      handle: 'big',
      productIds: products.map((product) => product.id),
    });
    await repo.replaceCatalog(makeCatalog({ products, collections: [collection] }));

    const page = await repo.getProductsByCollection('big', { page: 2, perPage: 12 });
    expect(page.products).toHaveLength(12);
    expect(page.total).toBe(30);
    expect(page.totalPages).toBe(3);
    expect(page.page).toBe(2);
  });

  it('clamps a page beyond the end rather than returning nothing', async () => {
    const products = [makeProduct()];
    const collection = makeCollection({ handle: 'small', productIds: [products[0]!.id] });
    await repo.replaceCatalog(makeCatalog({ products, collections: [collection] }));

    const page = await repo.getProductsByCollection('small', { page: 99, perPage: 12 });
    expect(page.page).toBe(1);
    expect(page.products).toHaveLength(1);
  });

  it('returns an empty page for an unknown collection', async () => {
    await repo.replaceCatalog(makeCatalog());
    const page = await repo.getProductsByCollection('nope');
    expect(page.total).toBe(0);
    expect(page.products).toEqual([]);
  });

  it('preserves caller order in getProductsByHandles', async () => {
    const a = makeProduct({ handle: 'aaa' });
    const b = makeProduct({ handle: 'bbb' });
    await repo.replaceCatalog(makeCatalog({ products: [a, b] }));

    const result = await repo.getProductsByHandles(['bbb', 'aaa']);
    expect(result.map((product) => product.handle)).toEqual(['bbb', 'aaa']);
  });

  it('ranks search results by relevance by default', async () => {
    await repo.replaceCatalog(
      makeCatalog({
        products: [
          makeProduct({ handle: 'wool-scarf', title: 'Wool Scarf' }),
          makeProduct({ handle: 'wool-hat', title: 'Wool Hat' }),
          makeProduct({
            handle: 'silk-tie',
            title: 'Silk Tie',
            variants: [makeVariant({ price: 80 })],
          }),
        ],
      }),
    );

    const result = await repo.searchProducts('wool scarf');
    expect(result.hits[0]?.product.handle).toBe('wool-scarf');
  });
});

describe('JsonRedirectRepository', () => {
  let redirects: InstanceType<typeof JsonRedirectRepository>;

  beforeEach(async () => {
    await fs.rm(REDIRECTS_PATH, { force: true });
    redirects = new JsonRedirectRepository();
  });

  it('resolves a recorded rename', async () => {
    await redirects.record('products', 'old-handle', 'new-handle');
    expect(await redirects.resolveProduct('old-handle')).toBe('new-handle');
  });

  it('returns null for a handle with no redirect', async () => {
    expect(await redirects.resolveProduct('never-renamed')).toBeNull();
  });

  it('follows a chain of renames to the current handle', async () => {
    await redirects.record('products', 'a', 'b');
    await redirects.record('products', 'b', 'c');
    expect(await redirects.resolveProduct('a')).toBe('c');
  });

  it('refuses to resolve a cycle', async () => {
    await redirects.record('products', 'x', 'y');
    await redirects.record('products', 'y', 'x');
    expect(await redirects.resolveProduct('x')).toBeNull();
  });

  it('never records a self-redirect', async () => {
    await redirects.record('products', 'same', 'same');
    expect(await redirects.resolveProduct('same')).toBeNull();
  });

  it('keeps product and collection namespaces separate', async () => {
    await redirects.record('collections', 'old-collection', 'new-collection');
    expect(await redirects.resolveProduct('old-collection')).toBeNull();
    expect(await redirects.resolveCollection('old-collection')).toBe('new-collection');
  });
});
