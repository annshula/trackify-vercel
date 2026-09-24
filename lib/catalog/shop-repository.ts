import 'server-only';
import type { ShopCatalog, ShopContact, ShopHomeContent, ShopPdpContent, ShopPolicies } from '@/types/shop';

const EMPTY_HOME: ShopHomeContent = {
  featuredCollectionId: null,
  spotlightProductId: null,
  intro: [],
  differentiators: [],
  lifestyle: [],
  story: [],
  faq: [],
};

const EMPTY_PDP: ShopPdpContent = {
  announcement: null,
  shipping: { processingTime: null, deliveryEstimate: null, costNote: null, regions: null },
  trustPoints: [],
};
import { SHOP_PATH, readJsonFile, withMutex, writeJsonFileAtomic } from './storage';

const EMPTY_SHOP_CATALOG: ShopCatalog = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  contact: { email: null, phone: null, address: null },
  policies: {
    termsOfService: null,
    privacyPolicy: null,
    refundPolicy: null,
    shippingPolicy: null,
  },
};

/**
 * The single seam between the storefront and its shop-details storage —
 * mirrors BlogRepository (lib/catalog/blog-repository.ts). UI never imports
 * shop.json directly.
 *
 * Reading contact details and policies live from Shopify on every request
 * (the previous approach) forced the entire /pages/[handle] route to render
 * dynamically instead of serving cached HTML — the same problem
 * ProductRepository and BlogRepository already solved for the catalog and
 * blog content: sync periodically into a JSON file, read that file
 * synchronously at render time.
 */
export interface ShopRepository {
  getCatalogMeta(): Promise<Pick<ShopCatalog, 'version' | 'generatedAt'>>;
  getContact(): Promise<ShopContact>;
  getPolicies(): Promise<ShopPolicies>;
  /** Store-wide PDP content; empty (never defaulted) when shop.json predates it. */
  getPdpContent(): Promise<ShopPdpContent>;
  /** Homepage content; empty (never defaulted) when shop.json predates it. */
  getHomeContent(): Promise<ShopHomeContent>;

  /** Write path — used by sync only. */
  replaceCatalog(catalog: ShopCatalog): Promise<void>;
}

/**
 * JSON-backed shop details — same shape as JsonBlogRepository: the whole
 * file is held in memory after the first read, and only writes touch the
 * shared catalog mutex.
 */
export class JsonShopRepository implements ShopRepository {
  #catalog: ShopCatalog | null = null;
  #loading: Promise<ShopCatalog> | null = null;

  async #load(): Promise<ShopCatalog> {
    if (this.#catalog) return this.#catalog;
    this.#loading ??= (async () => {
      const stored = await readJsonFile<ShopCatalog>(SHOP_PATH);
      const catalog = stored ?? EMPTY_SHOP_CATALOG;
      this.#catalog = catalog;
      this.#loading = null;
      return catalog;
    })();
    return this.#loading;
  }

  /** Drops the in-memory copy so the next read reloads from disk. */
  invalidate(): void {
    this.#catalog = null;
    this.#loading = null;
  }

  async getCatalogMeta() {
    const catalog = await this.#load();
    return { version: catalog.version, generatedAt: catalog.generatedAt };
  }

  async getContact(): Promise<ShopContact> {
    const catalog = await this.#load();
    return catalog.contact;
  }

  async getPolicies(): Promise<ShopPolicies> {
    const catalog = await this.#load();
    return catalog.policies;
  }

  async getPdpContent(): Promise<ShopPdpContent> {
    const catalog = await this.#load();
    return catalog.pdp ?? EMPTY_PDP;
  }

  async getHomeContent(): Promise<ShopHomeContent> {
    const catalog = await this.#load();
    return catalog.home ?? EMPTY_HOME;
  }

  async replaceCatalog(catalog: ShopCatalog): Promise<void> {
    await withMutex(async () => {
      await writeJsonFileAtomic(SHOP_PATH, catalog);
      this.#catalog = catalog;
      this.#loading = null;
    });
  }
}
