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

// Survives dev-server hot reloads so the in-memory shop catalog is not rebuilt per edit.
const shopRepositoryInstance = globalThis.__tfShopRepository ?? new JsonShopRepository();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__tfShopRepository = shopRepositoryInstance;
}

export const shopRepository: ShopRepository = shopRepositoryInstance;

/** Forces the next read to come from disk. Called after a sync writes. */
export function invalidateShopCache(): void {
  shopRepositoryInstance.invalidate();
}

export type { ShopRepository } from './shop-repository';
