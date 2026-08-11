import 'server-only';
import type { Catalog, CatalogCollection, CatalogProduct, RedirectMap } from '@/types/catalog';
import type {
  FacetValue,
  ProductFacets,
  ProductPage,
  ProductQuery,
  ProductRepository,
  ProductSort,
  RedirectRepository,
  SearchHit,
} from './repository';
import { isPurchasable } from './normalize';
import { searchCatalog, suggestTerms } from './search';
import {
  CATALOG_PATH,
  REDIRECTS_PATH,
  readJsonFile,
  withMutex,
  writeJsonFileAtomic,
} from './storage';

const EMPTY_CATALOG: Catalog = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  shop: { domain: '', name: null, currencyCode: 'USD' },
  products: [],
  collections: [],
};

const EMPTY_REDIRECTS: RedirectMap = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  products: {},
  collections: {},
};

/**
 * JSON-backed catalog.
 *
 * The whole catalog is held in memory after the first read — for a single
 * store this is a few MB at most and removes disk I/O from every render.
 * Reads never touch the mutex; only writes do.
 */
export class JsonProductRepository implements ProductRepository {
  #catalog: Catalog | null = null;
  #loading: Promise<Catalog> | null = null;
  #byHandle = new Map<string, CatalogProduct>();
  #byId = new Map<string, CatalogProduct>();
  #collectionsByHandle = new Map<string, CatalogCollection>();
  #availableProducts: CatalogProduct[] = [];

  async #load(): Promise<Catalog> {
    if (this.#catalog) return this.#catalog;
    this.#loading ??= (async () => {
      const stored = await readJsonFile<Catalog>(CATALOG_PATH);
      const catalog = stored ?? EMPTY_CATALOG;
      this.#setCatalog(catalog);
      return catalog;
    })();
    return this.#loading;
  }

  #setCatalog(catalog: Catalog): void {
    this.#catalog = catalog;
    this.#byHandle = new Map(catalog.products.map((product) => [product.handle, product]));
    this.#byId = new Map(catalog.products.map((product) => [product.id, product]));
    this.#collectionsByHandle = new Map(catalog.collections.map((collection) => [collection.handle, collection]));
    this.#availableProducts = catalog.products.filter(isPurchasable);
    this.#loading = null;
  }

  /** Drops the in-memory copy so the next read reloads from disk. */
  invalidate(): void {
    this.#catalog = null;
    this.#loading = null;
  }

  async #persist(catalog: Catalog): Promise<void> {
    await writeJsonFileAtomic(CATALOG_PATH, catalog);
    this.#setCatalog(catalog);
  }

  async getCatalogMeta() {
    const catalog = await this.#load();
    return { version: catalog.version, generatedAt: catalog.generatedAt, shop: catalog.shop };
  }

  async getAllProducts(options: { includeUnavailable?: boolean } = {}): Promise<CatalogProduct[]> {
    const catalog = await this.#load();
    return options.includeUnavailable ? catalog.products : this.#availableProducts;
  }

  async getProductById(id: string): Promise<CatalogProduct | null> {
    await this.#load();
    return this.#byId.get(id) ?? null;
  }

  async getProductByHandle(handle: string): Promise<CatalogProduct | null> {
    await this.#load();
    const product = this.#byHandle.get(handle);
    if (!product || !isPurchasable(product)) return null;
    return product;
  }

  async getProductsByHandles(handles: string[]): Promise<CatalogProduct[]> {
    await this.#load();
    const result: CatalogProduct[] = [];
    for (const handle of handles) {
      const product = this.#byHandle.get(handle);
      if (product && isPurchasable(product)) result.push(product);
    }
    return result;
  }

  async getAllCollections(): Promise<CatalogCollection[]> {
    const catalog = await this.#load();
    return catalog.collections;
  }

  async getCollectionByHandle(handle: string): Promise<CatalogCollection | null> {
    await this.#load();
    return this.#collectionsByHandle.get(handle) ?? null;
  }

  async queryProducts(query: ProductQuery = {}): Promise<ProductPage> {
    const products = await this.getAllProducts({ includeUnavailable: query.includeUnavailable });
    return paginate(applyFilters(products, query), query, buildFacets(products, query));
  }

  async getProductsByCollection(handle: string, query: ProductQuery = {}): Promise<ProductPage> {
    await this.#load();
    const collection = this.#collectionsByHandle.get(handle);
    if (!collection) {
      return {
        products: [],
        total: 0,
        page: 1,
        perPage: query.perPage ?? 24,
        totalPages: 0,
        facets: emptyFacets(),
      };
    }

    const memberIds = new Set(collection.productIds);
    const members = (await this.getAllProducts({ includeUnavailable: query.includeUnavailable })).filter(
      (product) => memberIds.has(product.id),
    );

    // Facets describe the collection, not the current filter selection, so the
    // panel does not collapse to a single option after the first click.
    return paginate(applyFilters(members, query), query, buildFacets(members, query));
  }

  async searchProducts(term: string, query: ProductQuery = {}) {
    const products = await this.getAllProducts({ includeUnavailable: query.includeUnavailable });
    const hits = searchCatalog(products, term, 200);
    const matched = hits.map((hit) => hit.product);
    const filtered = applyFilters(matched, { ...query, sort: query.sort ?? 'relevance' });

    const rank = new Map(hits.map((hit, index) => [hit.product.id, index]));
    const ordered =
      (query.sort ?? 'relevance') === 'relevance'
        ? [...filtered].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
        : filtered;

    const page = paginate(ordered, query, buildFacets(matched, query));
    const hitById = new Map(hits.map((hit) => [hit.product.id, hit]));

    return {
      hits: page.products.map<SearchHit>(
        (product) => hitById.get(product.id) ?? { product, score: 0, matchedOn: [] },
      ),
      total: page.total,
      facets: page.facets,
    };
  }

  async suggest(term: string, limit = 6) {
    const products = await this.getAllProducts();
    const collections = await this.getAllCollections();
    const normalized = term.trim().toLowerCase();

    return {
      products: searchCatalog(products, term, limit).map((hit) => hit.product),
      collections: collections
        .filter(
          (collection) =>
            collection.title.toLowerCase().includes(normalized) ||
            collection.handle.includes(normalized),
        )
        .slice(0, 3),
      terms: suggestTerms(products, term, 5),
    };
  }

  async updateProduct(product: CatalogProduct): Promise<void> {
    await withMutex(async () => {
      // Re-read inside the mutex: another writer may have persisted since load.
      this.invalidate();
      const catalog = await this.#load();
      const products = [...catalog.products];
      const index = products.findIndex((existing) => existing.id === product.id);

      if (index === -1) products.push(product);
      else {
        const existing = products[index];
        // Drop out-of-order webhook deliveries rather than reverting newer data.
        if (existing && existing.updatedAt > product.updatedAt) return;
        products[index] = product;
      }

      await this.#persist({
        ...catalog,
        products: products.sort((a, b) => a.id.localeCompare(b.id)),
        generatedAt: new Date().toISOString(),
      });
    });
  }

  async deleteProduct(id: string): Promise<boolean> {
    return withMutex(async () => {
      this.invalidate();
      const catalog = await this.#load();
      const products = catalog.products.filter((product) => product.id !== id);
      if (products.length === catalog.products.length) return false;

      const collections = catalog.collections.map((collection) => ({
        ...collection,
        productIds: collection.productIds.filter((productId) => productId !== id),
      }));

      await this.#persist({ ...catalog, products, collections, generatedAt: new Date().toISOString() });
      return true;
    });
  }

  async updateCollection(collection: CatalogCollection): Promise<void> {
    await withMutex(async () => {
      this.invalidate();
      const catalog = await this.#load();
      const collections = [...catalog.collections];
      const index = collections.findIndex((existing) => existing.id === collection.id);
      if (index === -1) collections.push(collection);
      else collections[index] = collection;

      await this.#persist({
        ...catalog,
        collections: collections.sort((a, b) => a.id.localeCompare(b.id)),
        generatedAt: new Date().toISOString(),
      });
    });
  }

  async deleteCollection(id: string): Promise<boolean> {
    return withMutex(async () => {
      this.invalidate();
      const catalog = await this.#load();
      const collections = catalog.collections.filter((collection) => collection.id !== id);
      if (collections.length === catalog.collections.length) return false;

      const products = catalog.products.map((product) => ({
        ...product,
        collections: product.collections.filter((ref) => ref.id !== id),
      }));

      await this.#persist({ ...catalog, products, collections, generatedAt: new Date().toISOString() });
      return true;
    });
  }

  async replaceCatalog(catalog: Catalog): Promise<void> {
    await withMutex(async () => {
      await this.#persist(catalog);
    });
  }
}

/* ── Redirects ─────────────────────────────────────────────────────────── */

export class JsonRedirectRepository implements RedirectRepository {
  #map: RedirectMap | null = null;

  async #load(): Promise<RedirectMap> {
    this.#map ??= (await readJsonFile<RedirectMap>(REDIRECTS_PATH)) ?? EMPTY_REDIRECTS;
    return this.#map;
  }

  invalidate(): void {
    this.#map = null;
  }

  async getAll(): Promise<RedirectMap> {
    return this.#load();
  }

  async resolveProduct(oldHandle: string): Promise<string | null> {
    return resolveChain((await this.#load()).products, oldHandle);
  }

  async resolveCollection(oldHandle: string): Promise<string | null> {
    return resolveChain((await this.#load()).collections, oldHandle);
  }

  async record(kind: 'products' | 'collections', oldHandle: string, newHandle: string): Promise<void> {
    if (oldHandle === newHandle) return;
    await withMutex(async () => {
      this.invalidate();
      const map = await this.#load();
      const next: RedirectMap = {
        ...map,
        updatedAt: new Date().toISOString(),
        products: { ...map.products },
        collections: { ...map.collections },
      };
      next[kind][oldHandle] = newHandle;
      // A handle that came back into use must not redirect to itself.
      delete next[kind][newHandle];
      await writeJsonFileAtomic(REDIRECTS_PATH, next);
      this.#map = next;
    });
  }
}

/** Follows a→b→c so a rename chain still lands on the current handle. */
function resolveChain(map: Record<string, string>, from: string): string | null {
  let current: string | undefined = map[from];
  if (!current) return null;

  const seen = new Set<string>([from]);
  for (let hops = 0; hops < 10; hops += 1) {
    if (seen.has(current)) return null; // cycle — refuse to redirect
    const next: string | undefined = map[current];
    if (!next) return current;
    seen.add(current);
    current = next;
  }
  return current;
}

/* ── Query helpers ─────────────────────────────────────────────────────── */

function variantInStock(product: CatalogProduct): boolean {
  return product.variants.some((variant) => variant.availableForSale);
}

function isOnSale(product: CatalogProduct): boolean {
  return product.variants.some(
    (variant) => variant.compareAtPrice !== null && variant.compareAtPrice > variant.price,
  );
}

export function applyFilters(products: CatalogProduct[], query: ProductQuery): CatalogProduct[] {
  const filters = query.filters ?? {};
  let result = products;

  if (filters.collectionHandles?.length) {
    const wanted = new Set(filters.collectionHandles);
    result = result.filter((product) => product.collections.some((c) => wanted.has(c.handle)));
  }
  if (filters.productTypes?.length) {
    const wanted = new Set(filters.productTypes.map((v) => v.toLowerCase()));
    result = result.filter((product) => wanted.has(product.productType.toLowerCase()));
  }
  if (filters.vendors?.length) {
    const wanted = new Set(filters.vendors.map((v) => v.toLowerCase()));
    result = result.filter((product) => wanted.has(product.vendor.toLowerCase()));
  }
  if (filters.tags?.length) {
    const wanted = new Set(filters.tags.map((v) => v.toLowerCase()));
    result = result.filter((product) => product.tags.some((tag) => wanted.has(tag.toLowerCase())));
  }
  if (filters.options) {
    for (const [name, values] of Object.entries(filters.options)) {
      if (!values.length) continue;
      const wanted = new Set(values.map((v) => v.toLowerCase()));
      result = result.filter((product) =>
        product.variants.some((variant) =>
          variant.selectedOptions.some(
            (option) => option.name.toLowerCase() === name.toLowerCase() && wanted.has(option.value.toLowerCase()),
          ),
        ),
      );
    }
  }
  if (typeof filters.minPrice === 'number') {
    result = result.filter((product) => product.priceRange.max >= filters.minPrice!);
  }
  if (typeof filters.maxPrice === 'number') {
    result = result.filter((product) => product.priceRange.min <= filters.maxPrice!);
  }
  if (filters.inStockOnly) result = result.filter(variantInStock);
  if (filters.onSaleOnly) result = result.filter(isOnSale);

  return sortProducts(result, query.sort ?? 'newest');
}

export function sortProducts(products: CatalogProduct[], sort: ProductSort): CatalogProduct[] {
  const sorted = [...products];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.priceRange.min - b.priceRange.min);
    case 'price-desc':
      return sorted.sort((a, b) => b.priceRange.max - a.priceRange.max);
    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'title-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case 'newest':
      return sorted.sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
    case 'best-selling':
      // Shopify's sales ranking is not in the catalog; approximate with
      // in-stock breadth so the option is honest rather than random.
      return sorted.sort(
        (a, b) =>
          b.variants.filter((v) => v.availableForSale).length -
            a.variants.filter((v) => v.availableForSale).length ||
          a.title.localeCompare(b.title),
      );
    case 'relevance':
    default:
      return sorted;
  }
}

function countInto(map: Map<string, number>, key: string): void {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function toFacetValues(map: Map<string, number>, limit = 30): FacetValue[] {
  return [...map.entries()]
    .map(([value, count]) => ({ value: value.toLowerCase(), label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function emptyFacets(): ProductFacets {
  return {
    productTypes: [],
    vendors: [],
    tags: [],
    options: [],
    priceBounds: { min: 0, max: 0, currencyCode: 'USD' },
    availability: { inStock: 0, outOfStock: 0 },
    onSale: 0,
  };
}

export function buildFacets(products: CatalogProduct[], _query: ProductQuery = {}): ProductFacets {
  if (products.length === 0) return emptyFacets();

  const types = new Map<string, number>();
  const vendors = new Map<string, number>();
  const tags = new Map<string, number>();
  const options = new Map<string, Map<string, number>>();

  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let inStock = 0;
  let onSale = 0;
  const currencyCode = products[0]?.priceRange.currencyCode ?? 'USD';

  for (const product of products) {
    countInto(types, product.productType);
    countInto(vendors, product.vendor);
    for (const tag of product.tags) countInto(tags, tag);

    for (const option of product.options) {
      let bucket = options.get(option.name);
      if (!bucket) {
        bucket = new Map<string, number>();
        options.set(option.name, bucket);
      }
      // Count each option value once per product, not once per variant.
      for (const value of new Set(option.values)) countInto(bucket, value);
    }

    min = Math.min(min, product.priceRange.min);
    max = Math.max(max, product.priceRange.max);
    if (variantInStock(product)) inStock += 1;
    if (isOnSale(product)) onSale += 1;
  }

  return {
    productTypes: toFacetValues(types),
    vendors: toFacetValues(vendors),
    tags: toFacetValues(tags, 40),
    options: [...options.entries()]
      .map(([name, values]) => ({ name, values: toFacetValues(values, 40) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    priceBounds: {
      min: Number.isFinite(min) ? Math.floor(min) : 0,
      max: Math.ceil(max),
      currencyCode,
    },
    availability: { inStock, outOfStock: products.length - inStock },
    onSale,
  };
}

function paginate(products: CatalogProduct[], query: ProductQuery, facets: ProductFacets): ProductPage {
  const perPage = Math.min(Math.max(query.perPage ?? 24, 1), 96);
  const totalPages = Math.max(1, Math.ceil(products.length / perPage));
  const page = Math.min(Math.max(query.page ?? 1, 1), totalPages);
  const start = (page - 1) * perPage;

  return {
    products: products.slice(start, start + perPage),
    total: products.length,
    page,
    perPage,
    totalPages: products.length === 0 ? 0 : totalPages,
    facets,
  };
}
