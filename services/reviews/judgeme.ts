import "server-only";

import type { Review, ReviewProvider } from "@/components/product/reviews";

/**
 * Judge.me review provider.
 *
 * Judge.me's public "Get Reviews" REST endpoint is keyed by the store's
 * `shop_domain` + a `api_token` (Settings → Integrations → judge.me API in
 * the Judge.me admin — this is a read scope token, safe to hold server-side
 * but still never exposed to the browser). Reviews are looked up by the
 * product's Shopify handle, which this storefront already uses verbatim as
 * the URL segment (see `CatalogProduct.handle`), so no id mapping is needed.
 *
 * Docs: https://judge.me/api/docs/v1
 *
 * Attachments (customer photos/videos) come back per-review under `pictures`
 * (and `videos` in newer accounts) as full asset URLs — Judge.me hosts them,
 * so no image proxy or `next.config.ts` remotePatterns change is needed
 * beyond allowing Judge.me's CDN host (`cdn.judge.me`), which is required for
 * `next/image` to render them.
 */

const JUDGEME_API_BASE = "https://judge.me/api/v1";
const PAGE_SIZE = 10;

type JudgeMePicture = {
  urls?: { original?: string; small?: string; compact?: string; huge?: string };
};

type JudgeMeReview = {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  reviewer?: { name?: string | null };
  created_at: string;
  verified: "buyer" | "not_verified" | string;
  pictures?: JudgeMePicture[];
  curated?: string;
};

type JudgeMeReviewsResponse = {
  reviews: JudgeMeReview[];
  current_page: number;
  per_page: number;
};

type JudgeMeProductResponse = {
  product?: {
    /** Judge.me's own product id — the only key its review endpoints filter by. */
    id?: number;
    review_number?: number;
    average_rating?: number;
    rating_histogram?: number[]; // index 0 = 1★ … index 4 = 5★, per Judge.me docs
  };
};

type JudgeMeCountResponse = { count: number };

function env(): { shopDomain: string; apiToken: string } | null {
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const apiToken = process.env.JUDGEME_API_TOKEN;
  if (!shopDomain || !apiToken) return null;
  return { shopDomain, apiToken };
}

function mapReview(raw: JudgeMeReview): Review {
  const attachments = (raw.pictures ?? [])
    .map((pic) => pic.urls?.huge ?? pic.urls?.original ?? pic.urls?.compact ?? pic.urls?.small)
    .filter((url): url is string => Boolean(url))
    // Reviews imported from AliExpress link photos on ae01.alicdn.com, which
    // often doesn't connect at all; the same /kf/ files are served by
    // AliExpress's other image host, which does.
    .map((url) => url.replace(/^https:\/\/ae01\.alicdn\.com\/kf\//, "https://ae-pic-a1.aliexpress-media.com/kf/"));

  return {
    id: String(raw.id),
    author: raw.reviewer?.name?.trim() || "Verified customer",
    rating: raw.rating,
    title: raw.title?.trim() || null,
    body: raw.body?.trim() ?? "",
    createdAt: raw.created_at,
    verifiedPurchase: raw.verified === "buyer",
    attachments,
  };
}

async function judgeMeFetch<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const config = env();
  if (!config) return null;

  const url = new URL(`${JUDGEME_API_BASE}${path}`);
  url.searchParams.set("api_token", config.apiToken);
  url.searchParams.set("shop_domain", config.shopDomain);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  try {
    const res = await fetch(url, {
      // Reviews change infrequently; revalidate hourly alongside the product page.
      next: { revalidate: 3600, tags: ["judgeme-reviews"] },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // Never let a Judge.me outage break the product page.
    return null;
  }
}

export const judgeMeReviewProvider: ReviewProvider = {
  canSubmit: false,

  async list(handle, options = {}) {
    const empty = {
      reviews: [],
      total: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>,
    };

    // `/reviews` and `/reviews/count` silently IGNORE a `handle` param and
    // return the whole store's reviews — every product showed the same list.
    // They only filter by Judge.me's own product id, so resolve that first
    // (`/products/-1?handle=` is the documented handle lookup). No id means
    // Judge.me doesn't know the product: show nothing rather than the store's
    // reviews under the wrong product.
    const productRes = await judgeMeFetch<JudgeMeProductResponse>("/products/-1", { handle });
    const productId = productRes?.product?.id;
    if (!productId) return empty;
    const scope = { product_id: String(productId), published: "true" };

    const page = options.page ?? 1;
    const params: Record<string, string> = {
      ...scope,
      page: String(page),
      per_page: String(PAGE_SIZE),
    };
    if (options.rating) params.rating = String(options.rating);

    // `/products/-1` doesn't return `review_number` / `rating_histogram` on
    // this store's plan (confirmed empty), and the reviews page itself only
    // ever holds PAGE_SIZE items — neither can tell us the *true* total or
    // per-star breakdown across all reviews. `/reviews/count` does, and
    // supports the same `rating` filter, so six cheap count calls (one
    // overall + one per star) replace the unreliable/incomplete fields.
    const [reviewsRes, totalCount, ...starCounts] = await Promise.all([
      judgeMeFetch<JudgeMeReviewsResponse>("/reviews", params),
      judgeMeFetch<JudgeMeCountResponse>("/reviews/count", scope),
      ...([1, 2, 3, 4, 5] as const).map((star) =>
        judgeMeFetch<JudgeMeCountResponse>("/reviews/count", { ...scope, rating: String(star) }),
      ),
    ]);

    if (!reviewsRes) return empty;

    const reviews = reviewsRes.reviews.map(mapReview);

    const histogram = productRes?.product?.rating_histogram;
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = histogram
      ? { 1: histogram[0] ?? 0, 2: histogram[1] ?? 0, 3: histogram[2] ?? 0, 4: histogram[3] ?? 0, 5: histogram[4] ?? 0 }
      : {
          1: starCounts[0]?.count ?? 0,
          2: starCounts[1]?.count ?? 0,
          3: starCounts[2]?.count ?? 0,
          4: starCounts[3]?.count ?? 0,
          5: starCounts[4]?.count ?? 0,
        };

    const total = productRes?.product?.review_number ?? totalCount?.count ?? reviews.length;
    const average =
      productRes?.product?.average_rating ??
      (total > 0
        ? ((distribution[1] * 1 +
            distribution[2] * 2 +
            distribution[3] * 3 +
            distribution[4] * 4 +
            distribution[5] * 5) /
            total) || (reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0)
        : 0);

    return { reviews, total, average, distribution };
  },
};

/** A review from anywhere in the store, with the product it's about. */
export type StoreReview = Review & {
  /** Shopify product id (numeric) — matches the catalog's `gid://shopify/Product/<id>`. */
  productExternalId: number | null;
  productTitle: string | null;
  /** Merchant pinned or featured it in Judge.me — preferred for homepage picks. */
  highlighted: boolean;
  /** Where Judge.me got it: "web" (written on this store), "aliexpress" (imported), … */
  source: string | null;
};

type JudgeMeStoreReview = JudgeMeReview & {
  product_external_id?: number | null;
  product_title?: string | null;
  featured?: boolean;
  pinned?: boolean;
  source?: string | null;
};

/**
 * Store-wide review aggregate plus the most recent published reviews, for the
 * homepage. The aggregate is computed from Judge.me's own per-star counts —
 * never estimated — and `null` when the store has no reviews or Judge.me
 * isn't configured, so the page hides social proof instead of faking it.
 */
export async function getStoreReviewHighlights(): Promise<{
  total: number;
  average: number;
  reviews: StoreReview[];
} | null> {
  const [list, ...starCounts] = await Promise.all([
    judgeMeFetch<{ reviews: JudgeMeStoreReview[] }>("/reviews", { published: "true", per_page: "100" }),
    ...([1, 2, 3, 4, 5] as const).map((star) =>
      judgeMeFetch<JudgeMeCountResponse>("/reviews/count", { published: "true", rating: String(star) }),
    ),
  ]);
  if (!list) return null;

  const counts = starCounts.map((res) => res?.count ?? 0);
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;
  const average = counts.reduce((sum, n, i) => sum + n * (i + 1), 0) / total;

  const reviews = list.reviews
    .filter((raw) => raw.curated !== "spam")
    .map((raw) => ({
      ...mapReview(raw),
      productExternalId: raw.product_external_id ?? null,
      productTitle: raw.product_title ?? null,
      highlighted: Boolean(raw.featured || raw.pinned),
      source: raw.source ?? null,
    }));

  return { total, average, reviews };
}
