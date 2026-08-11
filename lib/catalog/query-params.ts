import type { ProductQuery, ProductSort } from './repository';

/**
 * URL <-> ProductQuery.
 *
 * Filters live in the URL so a filtered listing is shareable, bookmarkable, and
 * survives back/forward — none of which is true of client-only filter state.
 */

export const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'best-selling', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'title-asc', label: 'Alphabetical: A–Z' },
  { value: 'title-desc', label: 'Alphabetical: Z–A' },
];

const VALID_SORTS = new Set<string>([...SORT_OPTIONS.map((option) => option.value), 'relevance']);

/** Reserved keys; anything else in the query string is treated as an option filter. */
const RESERVED = new Set(['q', 'sort', 'page', 'type', 'vendor', 'tag', 'min', 'max', 'stock', 'sale', 'variant']);

export type SearchParamsInput = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => item.split(','))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function number(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseProductQuery(params: SearchParamsInput, perPage = 24): ProductQuery {
  const rawSort = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sort: ProductSort = rawSort && VALID_SORTS.has(rawSort) ? (rawSort as ProductSort) : 'newest';

  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);

  const options: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (RESERVED.has(key)) continue;
    const values = list(value);
    if (values.length > 0) options[key] = values;
  }

  return {
    sort,
    page,
    perPage,
    filters: {
      productTypes: list(params.type),
      vendors: list(params.vendor),
      tags: list(params.tag),
      options,
      minPrice: number(params.min),
      maxPrice: number(params.max),
      inStockOnly: params.stock === 'in',
      onSaleOnly: params.sale === '1',
    },
  };
}

/** Immutable update of the current query string — used by every filter control. */
export function buildSearchParams(
  current: URLSearchParams,
  changes: Record<string, string | string[] | null>,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || (Array.isArray(value) && value.length === 0) || value === '') {
      next.delete(key);
    } else if (Array.isArray(value)) {
      next.set(key, value.join(','));
    } else {
      next.set(key, value);
    }
  }

  // Any filter change invalidates the current page position.
  if (!Object.hasOwn(changes, 'page')) next.delete('page');

  return next;
}

export function countActiveFilters(params: SearchParamsInput): number {
  let count = 0;
  for (const [key, value] of Object.entries(params)) {
    if (key === 'sort' || key === 'page' || key === 'q' || key === 'variant') continue;
    if (key === 'stock' && value !== 'in') continue;
    if (key === 'sale' && value !== '1') continue;
    if (key === 'min' || key === 'max') {
      count += 1;
      continue;
    }
    count += list(value).length;
  }
  return count;
}
