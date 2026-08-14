import 'server-only';
import { JsonBlogRepository } from './blog-repository';
import type { BlogRepository } from './blog-repository';

/**
 * The one place that picks a blog storage implementation — mirrors
 * lib/catalog/index.ts's ProductRepository wiring.
 */

declare global {
  var __tfBlogRepository: JsonBlogRepository | undefined;
}

// Survives dev-server hot reloads so the in-memory blog catalog is not rebuilt per edit.
const blogRepositoryInstance = globalThis.__tfBlogRepository ?? new JsonBlogRepository();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__tfBlogRepository = blogRepositoryInstance;
}

export const blogRepository: BlogRepository = blogRepositoryInstance;

/** Forces the next read to come from disk. Called after a webhook writes. */
export function invalidateBlogCache(): void {
  blogRepositoryInstance.invalidate();
}

export type { BlogRepository, ArticlePage } from './blog-repository';
