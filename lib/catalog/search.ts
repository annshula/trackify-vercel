import type { CatalogProduct } from '@/types/catalog';
import type { SearchHit } from './repository';

/**
 * Local catalog search.
 *
 * Field-weighted token matching with prefix support and a small typo tolerance.
 * Deliberately not a full inverted index — for a single store's catalog this is
 * both fast enough and far easier to reason about than an external dependency.
 */

const FIELD_WEIGHTS = {
  title: 10,
  handle: 6,
  productType: 4,
  vendor: 3.5,
  tags: 3,
  collections: 2.5,
  variantTitle: 2,
  sku: 6,
  description: 1,
} as const;

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/** Bounded Levenshtein — returns `max + 1` as soon as it is certain the distance exceeds max. */
function editDistanceWithin(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      current.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length] ?? max + 1;
}

/** 0 = no match, 1 = exact, lower for prefix/fuzzy. */
function tokenScore(queryToken: string, target: string): number {
  if (target === queryToken) return 1;
  if (target.startsWith(queryToken)) return 0.8;
  if (queryToken.length >= 4 && target.includes(queryToken)) return 0.5;
  // Only attempt fuzzy matching on words long enough for a typo to be plausible.
  if (queryToken.length >= 4) {
    const allowed = queryToken.length >= 7 ? 2 : 1;
    if (editDistanceWithin(queryToken, target, allowed) <= allowed) return 0.35;
  }
  return 0;
}

type IndexedProduct = {
  product: CatalogProduct;
  fields: { name: keyof typeof FIELD_WEIGHTS; tokens: string[] }[];
};

const indexCache = new WeakMap<CatalogProduct[], IndexedProduct[]>();

function buildIndex(products: CatalogProduct[]): IndexedProduct[] {
  const cached = indexCache.get(products);
  if (cached) return cached;

  const index = products.map<IndexedProduct>((product) => ({
    product,
    fields: [
      { name: 'title', tokens: tokenize(product.title) },
      { name: 'handle', tokens: tokenize(product.handle) },
      { name: 'productType', tokens: tokenize(product.productType) },
      { name: 'vendor', tokens: tokenize(product.vendor) },
      { name: 'tags', tokens: tokenize(product.tags.join(' ')) },
      { name: 'collections', tokens: tokenize(product.collections.map((c) => c.title).join(' ')) },
      { name: 'variantTitle', tokens: tokenize(product.variants.map((v) => v.title).join(' ')) },
      { name: 'sku', tokens: tokenize(product.variants.map((v) => v.sku ?? '').join(' ')) },
      // Long descriptions are truncated: matches beyond this rarely change ranking.
      { name: 'description', tokens: tokenize(product.description.slice(0, 1200)) },
    ],
  }));

  indexCache.set(products, index);
  return index;
}

export function searchCatalog(products: CatalogProduct[], term: string, limit = 60): SearchHit[] {
  const queryTokens = tokenize(term);
  if (queryTokens.length === 0) return [];

  const index = buildIndex(products);
  const hits: SearchHit[] = [];

  for (const entry of index) {
    let score = 0;
    const matchedOn = new Set<string>();
    let matchedTokenCount = 0;

    for (const queryToken of queryTokens) {
      let bestForToken = 0;
      let bestField: string | null = null;

      for (const field of entry.fields) {
        const weight = FIELD_WEIGHTS[field.name];
        for (const target of field.tokens) {
          const raw = tokenScore(queryToken, target);
          if (raw === 0) continue;
          const weighted = raw * weight;
          if (weighted > bestForToken) {
            bestForToken = weighted;
            bestField = field.name;
          }
        }
      }

      if (bestForToken > 0) {
        score += bestForToken;
        matchedTokenCount += 1;
        if (bestField) matchedOn.add(bestField);
      }
    }

    if (matchedTokenCount === 0) continue;

    // Require every token to match once the query gets specific, so "red wool
    // scarf" does not return every red thing in the store.
    const coverage = matchedTokenCount / queryTokens.length;
    if (queryTokens.length > 1 && coverage < 0.5) continue;
    score *= 0.5 + coverage * 0.5;

    // Gentle nudges: in-stock and discounted products are more useful results.
    if (entry.product.variants.some((variant) => variant.availableForSale)) score *= 1.08;
    if (entry.product.compareAtPriceRange) score *= 1.03;

    hits.push({ product: entry.product, score, matchedOn: [...matchedOn] });
  }

  hits.sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title));
  return hits.slice(0, limit);
}

/** Query completions derived from real catalog vocabulary — never invented. */
export function suggestTerms(products: CatalogProduct[], term: string, limit = 5): string[] {
  const prefix = term.trim().toLowerCase();
  if (prefix.length < 2) return [];

  const counts = new Map<string, number>();
  const add = (phrase: string) => {
    const normalized = phrase.trim();
    if (normalized.length < 2 || !normalized.toLowerCase().startsWith(prefix)) return;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  };

  for (const product of products) {
    add(product.productType);
    add(product.vendor);
    for (const tag of product.tags) add(tag);
    for (const collection of product.collections) add(collection.title);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([phrase]) => phrase);
}
