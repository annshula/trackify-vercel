/**
 * The synchronized blog read model — same contract as types/catalog.ts:
 * a PUBLIC document shipped to the build and read by SSR.
 */

import type { CatalogImage } from './catalog';

export type BlogArticleRef = {
  id: string;
  handle: string;
  title: string;
};

export type BlogArticle = {
  /** Shopify GID, e.g. gid://shopify/Article/123 */
  id: string;
  /** Shopify handle — used verbatim as the URL segment. Never re-slugified. */
  handle: string;
  blogId: string;
  blogHandle: string;
  blogTitle: string;
  title: string;
  bodyHtml: string;
  excerptHtml: string;
  image: CatalogImage | null;
  authorName: string | null;
  tags: string[];
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type Blog = {
  /** Shopify GID, e.g. gid://shopify/Blog/123 */
  id: string;
  handle: string;
  title: string;
  tags: string[];
  articleIds: string[];
  updatedAt: string | null;
};

export type BlogCatalog = {
  version: number;
  generatedAt: string;
  blogs: Blog[];
  articles: BlogArticle[];
};

export type BlogSyncStats = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  blogs: number;
  articles: number;
  added: string[];
  updated: string[];
  removed: string[];
  warnings: string[];
};
