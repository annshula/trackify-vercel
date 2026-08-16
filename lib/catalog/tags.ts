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

export function revalidateProduct(handle: string): void {
  purgeTag(CACHE_TAGS.product(handle));
  purgeTag(CACHE_TAGS.catalog);
  purgePath(`/products/${handle}`);
}

export function revalidateCollection(handle: string): void {
  purgeTag(CACHE_TAGS.collection(handle));
  purgeTag(CACHE_TAGS.catalog);
  purgePath(`/collections/${handle}`);
}

export function revalidateBlog(handle: string): void {
  purgeTag(CACHE_TAGS.blog(handle));
  purgeTag(CACHE_TAGS.blogCatalog);
  purgePath(`/blogs/${handle}`);
}

export function revalidateArticle(blogHandle: string, articleHandle: string): void {
  purgeTag(CACHE_TAGS.article(blogHandle, articleHandle));
  purgeTag(CACHE_TAGS.blogCatalog);
  purgePath(`/blogs/${blogHandle}/${articleHandle}`);
}
