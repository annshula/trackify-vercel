import { revalidatePath, revalidateTag } from 'next/cache';

/** Cache tag vocabulary shared by pages and webhook revalidation. */
export const CACHE_TAGS = {
  catalog: 'catalog',
  cart: 'cart',
  product: (handle: string) => `product:${handle}`,
  collection: (handle: string) => `collection:${handle}`,
  blogCatalog: 'blog-catalog',
  blog: (handle: string) => `blog:${handle}`,
  article: (blogHandle: string, articleHandle: string) => `article:${blogHandle}/${articleHandle}`,
} as const;

/**
 * Next 16 requires a cacheLife profile alongside the tag. Webhook-driven
 * invalidation always wants the entry gone now, so every call uses "max".
 */
export function purgeTag(tag: string): void {
  revalidateTag(tag, 'max');
}

export function purgePath(path: string, type?: 'layout' | 'page'): void {
  revalidatePath(path, type);
}
