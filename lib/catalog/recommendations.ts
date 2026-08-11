import type { CatalogProduct } from '@/types/catalog';

/**
 * Catalog-derived recommendations.
 *
 * Scored from real product relationships (shared collections, type, vendor,
 * tags, price proximity). Nothing here is fabricated — a product with no
 * relatives simply returns fewer results.
 */

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function relatedProducts(
  product: CatalogProduct,
  catalog: CatalogProduct[],
  limit = 8,
): CatalogProduct[] {
  const sourceCollections = new Set(product.collections.map((c) => c.handle));
  const sourceTags = new Set(product.tags.map((t) => t.toLowerCase()));
  const sourceMid = (product.priceRange.min + product.priceRange.max) / 2;

  const scored = catalog
    .filter((candidate) => candidate.id !== product.id)
    .map((candidate) => {
      const candidateCollections = new Set(candidate.collections.map((c) => c.handle));
      const candidateTags = new Set(candidate.tags.map((t) => t.toLowerCase()));

      let score = 0;
      score += jaccard(sourceCollections, candidateCollections) * 5;
      score += jaccard(sourceTags, candidateTags) * 3;
      if (candidate.productType && candidate.productType === product.productType) score += 2.5;
      if (candidate.vendor && candidate.vendor === product.vendor) score += 1.2;

      // Price proximity: same shelf, not a $12 accessory next to a $900 coat.
      const candidateMid = (candidate.priceRange.min + candidate.priceRange.max) / 2;
      const spread = Math.max(sourceMid, candidateMid, 1);
      score += (1 - Math.min(Math.abs(sourceMid - candidateMid) / spread, 1)) * 1.5;

      if (candidate.variants.some((variant) => variant.availableForSale)) score += 0.6;

      return { candidate, score };
    })
    .filter((entry) => entry.score > 0.8)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.candidate);
}

/**
 * "Complete the look" — deliberately biased toward a *different* product type
 * in a shared collection, so it complements rather than duplicates.
 */
export function complementaryProducts(
  product: CatalogProduct,
  catalog: CatalogProduct[],
  limit = 3,
): CatalogProduct[] {
  const sourceCollections = new Set(product.collections.map((c) => c.handle));
  if (sourceCollections.size === 0) return [];

  return catalog
    .filter(
      (candidate) =>
        candidate.id !== product.id &&
        candidate.productType !== product.productType &&
        candidate.variants.some((variant) => variant.availableForSale) &&
        candidate.collections.some((c) => sourceCollections.has(c.handle)),
    )
    .sort((a, b) => a.priceRange.min - b.priceRange.min)
    .slice(0, limit);
}

export function bestSellersProxy(catalog: CatalogProduct[], limit = 8): CatalogProduct[] {
  // Sales data is not in the public catalog. Rank by catalog signals that
  // correlate with merchandising priority instead of inventing numbers.
  return [...catalog]
    .map((product) => {
      let score = product.collections.length * 1.5;
      score += Math.min(product.images.length, 6) * 0.5;
      score += product.variants.filter((variant) => variant.availableForSale).length * 0.4;
      if (product.tags.some((tag) => /best|popular|featured|staff/i.test(tag))) score += 6;
      return { product, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.product);
}

export function newArrivals(catalog: CatalogProduct[], limit = 8): CatalogProduct[] {
  return [...catalog]
    .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
    .slice(0, limit);
}

export function onSaleProducts(catalog: CatalogProduct[], limit = 8): CatalogProduct[] {
  return catalog
    .filter((product) =>
      product.variants.some((variant) => variant.compareAtPrice !== null && variant.compareAtPrice > variant.price),
    )
    .slice(0, limit);
}
