import 'server-only';
import type { Blog, BlogArticle, BlogCatalog } from '@/types/blog';
import { isArticleVisible } from './normalize';
import { BLOG_PATH, readJsonFile, withMutex, writeJsonFileAtomic } from './storage';

const EMPTY_BLOG_CATALOG: BlogCatalog = {
  version: 1,
  generatedAt: new Date(0).toISOString(),
  blogs: [],
  articles: [],
};

export type ArticlePage = {
  articles: BlogArticle[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

/**
 * The single seam between the storefront and its blog storage — mirrors
 * ProductRepository (lib/catalog/repository.ts). UI never imports blog.json
 * directly.
 */
export interface BlogRepository {
  getCatalogMeta(): Promise<Pick<BlogCatalog, 'version' | 'generatedAt'>>;

  getAllBlogs(): Promise<Blog[]>;
  getBlogByHandle(handle: string): Promise<Blog | null>;

  getAllArticles(options?: { includeUnpublished?: boolean }): Promise<BlogArticle[]>;
  getArticleByHandle(blogHandle: string, articleHandle: string): Promise<BlogArticle | null>;
  getArticlesByBlog(blogHandle: string, options?: { page?: number; perPage?: number }): Promise<ArticlePage>;
  getRecentArticles(limit?: number): Promise<BlogArticle[]>;

  /** Write paths — used by sync and webhook processing only. */
  updateArticle(article: BlogArticle): Promise<void>;
  deleteArticle(id: string): Promise<boolean>;
  updateBlog(blog: Blog): Promise<void>;
  deleteBlog(id: string): Promise<boolean>;
  replaceCatalog(catalog: BlogCatalog): Promise<void>;
}

/**
 * JSON-backed blog content — same shape as JsonProductRepository
 * (lib/catalog/json-repository.ts): the whole file is held in memory after
 * the first read, and only writes touch the shared catalog mutex.
 */
export class JsonBlogRepository implements BlogRepository {
  #catalog: BlogCatalog | null = null;
  #loading: Promise<BlogCatalog> | null = null;
  #blogsByHandle = new Map<string, Blog>();
  #articlesByKey = new Map<string, BlogArticle>();
  #visibleArticles: BlogArticle[] = [];

  async #load(): Promise<BlogCatalog> {
    if (this.#catalog) return this.#catalog;
    this.#loading ??= (async () => {
      const stored = await readJsonFile<BlogCatalog>(BLOG_PATH);
      const catalog = stored ?? EMPTY_BLOG_CATALOG;
      this.#setCatalog(catalog);
      return catalog;
    })();
    return this.#loading;
  }

  #setCatalog(catalog: BlogCatalog): void {
    this.#catalog = catalog;
    this.#blogsByHandle = new Map(catalog.blogs.map((blog) => [blog.handle, blog]));
    this.#articlesByKey = new Map(
      catalog.articles.map((article) => [articleKey(article.blogHandle, article.handle), article]),
    );
    this.#visibleArticles = catalog.articles.filter(isArticleVisible);
    this.#loading = null;
  }

  /** Drops the in-memory copy so the next read reloads from disk. */
  invalidate(): void {
    this.#catalog = null;
    this.#loading = null;
  }

  async #persist(catalog: BlogCatalog): Promise<void> {
    await writeJsonFileAtomic(BLOG_PATH, catalog);
    this.#setCatalog(catalog);
  }

  async getCatalogMeta() {
    const catalog = await this.#load();
    return { version: catalog.version, generatedAt: catalog.generatedAt };
  }

  async getAllBlogs(): Promise<Blog[]> {
    const catalog = await this.#load();
    return catalog.blogs;
  }

  async getBlogByHandle(handle: string): Promise<Blog | null> {
    await this.#load();
    return this.#blogsByHandle.get(handle) ?? null;
  }

  async getAllArticles(options: { includeUnpublished?: boolean } = {}): Promise<BlogArticle[]> {
    const catalog = await this.#load();
    return options.includeUnpublished ? catalog.articles : this.#visibleArticles;
  }

  async getArticleByHandle(blogHandle: string, articleHandle: string): Promise<BlogArticle | null> {
    await this.#load();
    const article = this.#articlesByKey.get(articleKey(blogHandle, articleHandle));
    if (!article || !isArticleVisible(article)) return null;
    return article;
  }

  async getArticlesByBlog(blogHandle: string, options: { page?: number; perPage?: number } = {}): Promise<ArticlePage> {
    const articles = (await this.getAllArticles()).filter((article) => article.blogHandle === blogHandle);
    return paginateArticles(sortByPublishedDesc(articles), options);
  }

  async getRecentArticles(limit = 6): Promise<BlogArticle[]> {
    const articles = await this.getAllArticles();
    return sortByPublishedDesc(articles).slice(0, limit);
  }

  async updateArticle(article: BlogArticle): Promise<void> {
    await withMutex(async () => {
      this.invalidate();
      const catalog = await this.#load();
      const articles = [...catalog.articles];
      const index = articles.findIndex((existing) => existing.id === article.id);

      if (index === -1) articles.push(article);
      else {
        const existing = articles[index];
        // Drop out-of-order webhook deliveries rather than reverting newer data.
        if (existing?.updatedAt && article.updatedAt && existing.updatedAt > article.updatedAt) return;
        articles[index] = article;
      }

      const blogs = ensureBlogMembership(catalog.blogs, article);

      await this.#persist({
        ...catalog,
        articles: articles.sort((a, b) => a.id.localeCompare(b.id)),
        blogs,
        generatedAt: new Date().toISOString(),
      });
    });
  }

  async deleteArticle(id: string): Promise<boolean> {
    return withMutex(async () => {
      this.invalidate();
      const catalog = await this.#load();
      const articles = catalog.articles.filter((article) => article.id !== id);
      if (articles.length === catalog.articles.length) return false;

      const blogs = catalog.blogs.map((blog) => ({
        ...blog,
        articleIds: blog.articleIds.filter((articleId) => articleId !== id),
      }));

      await this.#persist({ ...catalog, articles, blogs, generatedAt: new Date().toISOString() });
      return true;
    });
  }

  async updateBlog(blog: Blog): Promise<void> {
    await withMutex(async () => {
      this.invalidate();
      const catalog = await this.#load();
      const blogs = [...catalog.blogs];
      const index = blogs.findIndex((existing) => existing.id === blog.id);

      if (index === -1) blogs.push(blog);
      else blogs[index] = blog;

      await this.#persist({
        ...catalog,
        blogs: blogs.sort((a, b) => a.id.localeCompare(b.id)),
        generatedAt: new Date().toISOString(),
      });
    });
  }

  async deleteBlog(id: string): Promise<boolean> {
    return withMutex(async () => {
      this.invalidate();
      const catalog = await this.#load();
      const blogs = catalog.blogs.filter((blog) => blog.id !== id);
      if (blogs.length === catalog.blogs.length) return false;

      const articles = catalog.articles.filter((article) => article.blogId !== id);

      await this.#persist({ ...catalog, blogs, articles, generatedAt: new Date().toISOString() });
      return true;
    });
  }

  async replaceCatalog(catalog: BlogCatalog): Promise<void> {
    await withMutex(async () => {
      await this.#persist(catalog);
    });
  }
}

function articleKey(blogHandle: string, articleHandle: string): string {
  return `${blogHandle}/${articleHandle}`;
}

function sortByPublishedDesc(articles: BlogArticle[]): BlogArticle[] {
  return [...articles].sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));
}

function paginateArticles(articles: BlogArticle[], options: { page?: number; perPage?: number }): ArticlePage {
  const perPage = Math.min(Math.max(options.perPage ?? 12, 1), 48);
  const totalPages = Math.max(1, Math.ceil(articles.length / perPage));
  const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
  const start = (page - 1) * perPage;

  return {
    articles: articles.slice(start, start + perPage),
    total: articles.length,
    page,
    perPage,
    totalPages: articles.length === 0 ? 0 : totalPages,
  };
}

/** Keeps an article's parent blog's `articleIds` in sync on an article-only write. */
function ensureBlogMembership(blogs: Blog[], article: BlogArticle): Blog[] {
  const index = blogs.findIndex((blog) => blog.id === article.blogId);
  if (index === -1) {
    return [
      ...blogs,
      {
        id: article.blogId,
        handle: article.blogHandle,
        title: article.blogTitle,
        tags: [],
        articleIds: [article.id],
        updatedAt: null,
      },
    ];
  }

  const blog = blogs[index]!;
  if (blog.articleIds.includes(article.id)) return blogs;

  const next = [...blogs];
  next[index] = { ...blog, articleIds: [...blog.articleIds, article.id].sort() };
  return next;
}
