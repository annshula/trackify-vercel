import type { Catalog, CatalogCollection, CatalogProduct, RedirectMap } from '@/types/catalog';

/**
 * The single seam between the storefront and its catalog storage.
 *
 * UI never imports products.json. Swapping JsonProductRepository for a
 * Postgres/KV implementation is a one-line change in `lib/catalog/index.ts`.
 */

export type ProductSort =
  | 'relevance'
  | 'newest'
  | 'price-asc'
  | 'price-desc'
  | 'title-asc'
  | 'title-desc'
  | 'best-selling';

export type ProductFilters = {
  collectionHandles?: string[];
  productTypes?: string[];
  vendors?: string[];
  tags?: string[];
  /** option name (lowercased) -> selected values */
  options?: Record<string, string[]>;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
};

export type ProductQuery = {
  filters?: ProductFilters;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
  /** Include drafts/unpublished. Only ever true for diagnostics. */
  includeUnavailable?: boolean;
};

export type FacetValue = { value: string; label: string; count: number };

export type ProductFacets = {
  productTypes: FacetValue[];
  vendors: FacetValue[];
  tags: FacetValue[];
  options: { name: string; values: FacetValue[] }[];
  priceBounds: { min: number; max: number; currencyCode: string };
  availability: { inStock: number; outOfStock: number };
  onSale: number;
};

export type ProductPage = {
  products: CatalogProduct[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  facets: ProductFacets;
};

export type SearchHit = {
  product: CatalogProduct;
  score: number;
  matchedOn: string[];
};

export interface ProductRepository {
  getCatalogMeta(): Promise<Pick<Catalog, 'version' | 'generatedAt' | 'shop'>>;

  getAllProducts(options?: { includeUnavailable?: boolean }): Promise<CatalogProduct[]>;
  getProductById(id: string): Promise<CatalogProduct | null>;
  getProductByHandle(handle: string): Promise<CatalogProduct | null>;
  getProductsByHandles(handles: string[]): Promise<CatalogProduct[]>;
  getProductsByCollection(handle: string, query?: ProductQuery): Promise<ProductPage>;

  getAllCollections(): Promise<CatalogCollection[]>;
  getCollectionByHandle(handle: string): Promise<CatalogCollection | null>;

  queryProducts(query?: ProductQuery): Promise<ProductPage>;
  searchProducts(term: string, query?: ProductQuery): Promise<{ hits: SearchHit[]; total: number; facets: ProductFacets }>;
  suggest(term: string, limit?: number): Promise<{ products: CatalogProduct[]; collections: CatalogCollection[]; terms: string[] }>;

  /** Write paths — used by sync and webhook processing only. */
  updateProduct(product: CatalogProduct): Promise<void>;
  deleteProduct(id: string): Promise<boolean>;
  updateCollection(collection: CatalogCollection): Promise<void>;
  deleteCollection(id: string): Promise<boolean>;
  replaceCatalog(catalog: Catalog): Promise<void>;
}

export interface RedirectRepository {
  /** Returns the current handle for an old handle, or null. */
  resolveProduct(oldHandle: string): Promise<string | null>;
  resolveCollection(oldHandle: string): Promise<string | null>;
  record(kind: 'products' | 'collections', oldHandle: string, newHandle: string): Promise<void>;
  getAll(): Promise<RedirectMap>;
}
