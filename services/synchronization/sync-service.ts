import 'server-only';
import type { Catalog, CatalogCollection, CatalogProduct, SyncStats } from '@/types/catalog';
import { adminRequest, paginateAdmin } from '@/lib/shopify/admin';
import {
  COLLECTIONS_PAGE_QUERY,
  COLLECTION_BY_ID_QUERY,
  PRODUCTS_PAGE_QUERY,
  PRODUCT_BY_ID_QUERY,
  SHOP_QUERY,
} from '@/lib/shopify/queries/admin';
import {
  normalizeCollection,
  normalizeProduct,
  type AdminCollectionNode,
  type AdminProductNode,
} from '@/lib/catalog/normalize';
import { auditCatalog, catalogSchema, validateCatalog } from '@/lib/catalog/schema';
import { productRepository, redirectRepository } from '@/lib/catalog';
import { acquireLock, readJsonFile, CATALOG_PATH } from '@/lib/catalog/storage';
import { serverEnv } from '@/lib/validation/env';

export const CATALOG_VERSION = 1;

type ShopQueryResult = { shop: { name: string; myshopifyDomain: string; currencyCode: string } };

export type SyncOptions = {
  pageSize?: number;
  onProgress?: (message: string) => void;
};

/**
 * ShopifySyncService — the full catalog rebuild.
 *
 * Idempotent by construction: identical Shopify state produces a byte-identical
 * products.json (stable ordering everywhere, `generatedAt` excluded from the diff).
 */
export async function fullSync(options: SyncOptions = {}): Promise<SyncStats> {
  const startedAt = Date.now();
  const report = options.onProgress ?? (() => {});
  const warnings: string[] = [];
  const env = serverEnv();

  const lock = await acquireLock({ timeoutMs: 60_000 });

  try {
    report('Connecting to Shopify Admin GraphQL API…');
    const shopData = await adminRequest<ShopQueryResult>({ query: SHOP_QUERY });
    const currencyCode = shopData.shop.currencyCode;
    report(`Connected to ${shopData.shop.name} (${shopData.shop.myshopifyDomain}), currency ${currencyCode}`);

    report('Fetching products…');
    const productNodes = await paginateAdmin<AdminProductNode>(PRODUCTS_PAGE_QUERY, 'products', {
      pageSize: options.pageSize ?? 50,
      onPage: (nodes, page) => report(`  page ${page}: ${nodes.length} products`),
    });

    report('Fetching collections…');
    const collectionNodes = await paginateAdmin<AdminCollectionNode>(COLLECTIONS_PAGE_QUERY, 'collections', {
      pageSize: 50,
      onPage: (nodes, page) => report(`  page ${page}: ${nodes.length} collections`),
    });

    report('Normalizing…');
    const products = productNodes
      .map((node) => {
        try {
          return normalizeProduct(node, currencyCode);
        } catch (error) {
          warnings.push(`Skipped product ${node.handle}: ${(error as Error).message}`);
          return null;
        }
      })
      .filter((product): product is CatalogProduct => product !== null)
      // Products with no variants cannot be rendered or purchased.
      .filter((product) => {
        if (product.variants.length > 0) return true;
        warnings.push(`Skipped product ${product.handle}: no variants`);
        return false;
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    // Collection membership is derived from each product's own collections
    // connection — one traversal instead of N per-collection queries.
    const membership = new Map<string, string[]>();
    for (const product of products) {
      for (const ref of product.collections) {
        const list = membership.get(ref.id);
        if (list) list.push(product.id);
        else membership.set(ref.id, [product.id]);
      }
    }

    const collections = collectionNodes
      .map((node) => normalizeCollection(node, membership.get(node.id) ?? []))
      .sort((a, b) => a.id.localeCompare(b.id));

    const catalog: Catalog = {
      version: CATALOG_VERSION,
      generatedAt: new Date().toISOString(),
      shop: {
        domain: env.storeDomain,
        name: shopData.shop.name,
        currencyCode,
      },
      products,
      collections,
    };

    report('Validating…');
    const validation = validateCatalog(catalog);
    if (!validation.ok) {
      const detail = validation.issues.map((issue) => `  ${issue.path}: ${issue.message}`).join('\n');
      throw new Error(`Catalog failed schema validation — refusing to write.\n${detail}`);
    }

    const auditIssues = auditCatalog(catalogSchema.parse(catalog));
    const fatal = auditIssues.filter((issue) => issue.message.includes('Duplicate handle'));
    if (fatal.length > 0) {
      throw new Error(
        `Catalog has duplicate handles — refusing to write.\n${fatal
          .map((issue) => `  ${issue.path}: ${issue.message}`)
          .join('\n')}`,
      );
    }
    for (const issue of auditIssues) warnings.push(`${issue.path}: ${issue.message}`);

    report('Diffing against the previous catalog…');
    const previous = await readJsonFile<Catalog>(CATALOG_PATH);
    const diff = diffCatalogs(previous, catalog);

    let redirectsCreated = 0;
    for (const change of diff.handleChanges) {
      await redirectRepository.record('products', change.from, change.to);
      redirectsCreated += 1;
      report(`  redirect /products/${change.from} → /products/${change.to}`);
    }
    for (const change of diff.collectionHandleChanges) {
      await redirectRepository.record('collections', change.from, change.to);
      redirectsCreated += 1;
    }

    report('Writing data/products.json…');
    await productRepository.replaceCatalog(catalog);

    const finishedAt = Date.now();
    return {
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt,
      products: products.length,
      variants: products.reduce((sum, product) => sum + product.variants.length, 0),
      images: products.reduce((sum, product) => sum + product.images.length, 0),
      collections: collections.length,
      added: diff.added,
      updated: diff.updated,
      removed: diff.removed,
      redirectsCreated,
      warnings,
    };
  } finally {
    await lock.release();
  }
}

export type CatalogDiff = {
  added: string[];
  updated: string[];
  removed: string[];
  handleChanges: { id: string; from: string; to: string }[];
  collectionHandleChanges: { id: string; from: string; to: string }[];
};

export function diffCatalogs(previous: Catalog | null, next: Catalog): CatalogDiff {
  const diff: CatalogDiff = {
    added: [],
    updated: [],
    removed: [],
    handleChanges: [],
    collectionHandleChanges: [],
  };
  if (!previous) {
    diff.added = next.products.map((product) => product.handle);
    return diff;
  }

  const previousById = new Map(previous.products.map((product) => [product.id, product]));
  const nextIds = new Set(next.products.map((product) => product.id));

  for (const product of next.products) {
    const before = previousById.get(product.id);
    if (!before) {
      diff.added.push(product.handle);
      continue;
    }
    // Same Shopify ID with a different handle == a rename, not a new product.
    if (before.handle !== product.handle) {
      diff.handleChanges.push({ id: product.id, from: before.handle, to: product.handle });
    }
    if (JSON.stringify(before) !== JSON.stringify(product)) diff.updated.push(product.handle);
  }

  for (const product of previous.products) {
    if (!nextIds.has(product.id)) diff.removed.push(product.handle);
  }

  const previousCollections = new Map(previous.collections.map((collection) => [collection.id, collection]));
  for (const collection of next.collections) {
    const before = previousCollections.get(collection.id);
    if (before && before.handle !== collection.handle) {
      diff.collectionHandleChanges.push({ id: collection.id, from: before.handle, to: collection.handle });
    }
  }

  return diff;
}

/* ── Incremental (webhook) paths ───────────────────────────────────────── */

export async function syncSingleProduct(productGid: string): Promise<CatalogProduct | null> {
  const data = await adminRequest<{ product: AdminProductNode | null }>({
    query: PRODUCT_BY_ID_QUERY,
    variables: { id: productGid },
  });
  if (!data.product) return null;

  // Currency comes from the catalog the full sync already established.
  const meta = await productRepository.getCatalogMeta();
  const product = normalizeProduct(data.product, meta.shop.currencyCode || 'USD');

  const existing = await productRepository.getProductById(product.id);
  if (existing && existing.handle !== product.handle) {
    await redirectRepository.record('products', existing.handle, product.handle);
  }

  await productRepository.updateProduct(product);
  return product;
}

export async function syncSingleCollection(collectionGid: string): Promise<CatalogCollection | null> {
  const data = await adminRequest<{ collection: AdminCollectionNode | null }>({
    query: COLLECTION_BY_ID_QUERY,
    variables: { id: collectionGid },
  });
  if (!data.collection) return null;

  // Membership comes from the products already in the catalog, so a collection
  // update never triggers a full product re-fetch.
  const products = await productRepository.getAllProducts({ includeUnavailable: true });
  const memberIds = products
    .filter((product) => product.collections.some((ref) => ref.id === collectionGid))
    .map((product) => product.id);

  const existing = await productRepository.getCollectionByHandle(data.collection.handle);
  const collection = normalizeCollection(data.collection, memberIds);

  if (existing && existing.id === collection.id && existing.handle !== collection.handle) {
    await redirectRepository.record('collections', existing.handle, collection.handle);
  }

  await productRepository.updateCollection(collection);
  return collection;
}
