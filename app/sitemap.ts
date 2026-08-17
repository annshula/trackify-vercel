import type { MetadataRoute } from "next";
import { productRepository } from "@/lib/catalog";
import { blogRepository } from "@/lib/catalog/blog";
import { STATIC_PAGES } from "@/lib/content/pages";
import { publicEnv } from "@/lib/validation/env";

/**
 * Sitemap generated from the local catalog.
 *
 * Only indexable, publishable URLs appear. Search, cart, account and wishlist
 * are excluded — they are noindex by design.
 */

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;

  const [products, collections, blogs, articles] = await Promise.all([
    productRepository.getAllProducts().catch(() => []),
    productRepository.getAllCollections().catch(() => []),
    blogRepository.getAllBlogs().catch(() => []),
    blogRepository.getAllArticles().catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/collections`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
  ];

  if (articles.length > 0) {
    entries.push({ url: `${base}/blogs`, changeFrequency: "weekly", priority: 0.6 });
  }

  for (const blog of blogs) {
    entries.push({
      url: `${base}/blogs/${blog.handle}`,
      lastModified: blog.updatedAt ? new Date(blog.updatedAt) : undefined,
      changeFrequency: "weekly",
      priority: 0.5,
    });
  }

  for (const article of articles) {
    entries.push({
      url: `${base}/blogs/${article.blogHandle}/${article.handle}`,
      lastModified: new Date(article.updatedAt ?? article.publishedAt ?? article.createdAt),
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  for (const collection of collections) {
    if (collection.productIds.length === 0) continue;
    entries.push({
      url: `${base}/collections/${collection.handle}`,
      lastModified: new Date(collection.updatedAt),
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const product of products) {
    entries.push({
      url: `${base}/products/${product.handle}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly",
      // In-stock products are the ones worth crawling most often.
      priority: product.variants.some((variant) => variant.availableForSale)
        ? 0.7
        : 0.4,
    });
  }

  for (const page of STATIC_PAGES) {
    entries.push({
      url: `${base}/pages/${page.handle}`,
      changeFrequency: "monthly",
      priority: 0.3,
    });
  }

  return entries;
}
