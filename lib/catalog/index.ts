import 'server-only';
import { JsonProductRepository, JsonRedirectRepository } from './json-repository';
import type { ProductRepository, RedirectRepository } from './repository';

/**
 * The one place that picks a storage implementation.
 *
 * To move the catalog to Postgres or KV, implement ProductRepository and change
 * these two lines. No component, page, or service imports a concrete class.
 */

declare global {
  var __tfProductRepository: JsonProductRepository | undefined;
  var __tfRedirectRepository: JsonRedirectRepository | undefined;
}

// Survives dev-server hot reloads so the in-memory catalog is not rebuilt per edit.
const productRepositoryInstance = globalThis.__tfProductRepository ?? new JsonProductRepository();
const redirectRepositoryInstance = globalThis.__tfRedirectRepository ?? new JsonRedirectRepository();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__tfProductRepository = productRepositoryInstance;
  globalThis.__tfRedirectRepository = redirectRepositoryInstance;
}

export const productRepository: ProductRepository = productRepositoryInstance;
export const redirectRepository: RedirectRepository = redirectRepositoryInstance;

/** Forces the next read to come from disk. Called after a webhook writes. */
export function invalidateCatalogCache(): void {
  productRepositoryInstance.invalidate();
  redirectRepositoryInstance.invalidate();
}

export type { ProductRepository, RedirectRepository };
export * from './repository';
