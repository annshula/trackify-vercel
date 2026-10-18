import type { CatalogProduct } from "@/types/catalog";
import type { BlogArticle } from "@/types/blog";

const STOP = new Set(["with", "that", "this", "your", "from", "best", "pack", "smart", "kit"]);

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !STOP.has(word));

/**
 * Blog articles worth reading before buying this product, scored by how many
 * words its title, type and tags share with the article's title and tags.
 * Nothing is invented: with no overlap at all it falls back to the newest
 * articles, so the section still has something real to show.
 */
export function relatedArticles(
  product: CatalogProduct,
  articles: BlogArticle[],
  limit = 3,
): BlogArticle[] {
  const wanted = new Set(words(`${product.title} ${product.productType} ${product.tags.join(" ")}`));

  const scored = articles.map((article) => {
    const own = new Set(words(`${article.title} ${article.tags.join(" ")}`));
    let score = 0;
    for (const word of own) if (wanted.has(word)) score += 1;
    return { article, score };
  });

  const byDate = (a: BlogArticle, b: BlogArticle) =>
    (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt);

  const matched = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || byDate(a.article, b.article))
    .map((entry) => entry.article);

  const rest = [...articles].sort(byDate).filter((article) => !matched.includes(article));
  return [...matched, ...rest].slice(0, limit);
}

/** Plain-text teaser: the excerpt if the article has one, else the opening of its body. */
export function articleTeaser(article: BlogArticle, max = 150): string {
  const strip = (html: string) =>
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  const text = strip(article.excerptHtml) || strip(article.bodyHtml);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[.,;:–—-]+$/, "")}…`;
}
