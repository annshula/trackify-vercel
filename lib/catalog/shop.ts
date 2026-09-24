import 'server-only';
import { JsonShopRepository } from './shop-repository';
import type { ShopRepository } from './shop-repository';

/**
 * The one place that picks a shop storage implementation — mirrors
 * lib/catalog/blog.ts's BlogRepository wiring.
 */

declare global {
  var __tfShopRepository: JsonShopRepository | undefined;
}

// Survives dev-server hot reloads (and is shared between the page and API
// route bundles, which each load their own copy of the class) so every caller
// sees — and invalidates — the same in-memory shop catalog. Replaced only when
// it predates a method the current class has; reusing it then would fail with
// e.g. "getHomeContent is not a function". Not `instanceof`: separate bundles
// have separate class identities, which would split the cache per bundle.
const cached = globalThis.__tfShopRepository;
const isCurrent =
  cached !== undefined &&
  Object.getOwnPropertyNames(JsonShopRepository.prototype).every(
    (method) => typeof (cached as unknown as Record<string, unknown>)[method] === "function",
  );
const shopRepositoryInstance = isCurrent ? cached : new JsonShopRepository();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__tfShopRepository = shopRepositoryInstance;
}

export const shopRepository: ShopRepository = shopRepositoryInstance;

/** Forces the next read to come from disk. Called after a sync writes. */
export function invalidateShopCache(): void {
  shopRepositoryInstance.invalidate();
}

export type { ShopRepository } from './shop-repository';
