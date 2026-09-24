import type { CatalogProduct } from "@/types/catalog";
import { Rating } from "@/components/ui/primitives";
import { productRating } from "@/lib/catalog/selectors";
import { judgeMeReviewProvider } from "@/services/reviews/judgeme";
import { ReviewGallery } from "@/components/product/review-gallery";

/**
 * Reviews.
 *
 * Shopify has no first-party review API; reviews come from an app (Judge.me,
 * Okendo, Yotpo, Shopify Product Reviews …) that stores data in its own
 * service or in product metafields.
 *
 * This component renders whatever aggregate the store publishes to a metafield
 * (e.g. `reviews.rating` / `reviews.rating_count`). When a product has no
 * reviews at all — no aggregate and no provider — the whole section is hidden
 * rather than showing an empty placeholder. It never renders an invented
 * review. `ReviewProvider` below is the integration seam; `judgeMeReviewProvider`
 * (services/reviews/judgeme.ts) is the live implementation, wired below.
 */

export type Review = {
  id: string;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
  /** Customer-submitted photo/video URLs attached to the review, if any. */
  attachments: string[];
};

export interface ReviewProvider {
  /** Fetches reviews for a product handle. */
  list(
    handle: string,
    options?: { page?: number; rating?: number },
  ): Promise<{
    reviews: Review[];
    total: number;
    average: number;
    distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  }>;
  /** Whether the provider accepts submissions through this storefront. */
  canSubmit: boolean;
}

/**
 * Set `JUDGEME_API_TOKEN` (and `SHOPIFY_STORE_DOMAIN`, already required
 * elsewhere) in `.env.local` to go live. With no token configured, this
 * falls back to `null` and the section renders the metafield aggregate only
 * (or hides entirely, on a product with no reviews at all).
 */
export const reviewProvider: ReviewProvider | null = process.env.JUDGEME_API_TOKEN
  ? judgeMeReviewProvider
  : null;

export async function Reviews({ product }: { product: CatalogProduct }) {
  const aggregate = productRating(product);

  if (reviewProvider) {
    const data = await reviewProvider.list(product.handle);
    // No reviews from the provider — hide the whole section.
    if (data.total === 0) return null;
    return <ReviewGallery product={product} initialData={data} />;
  }

  // No provider: show the aggregate summary only when the store publishes one.
  if (!aggregate || aggregate.count === 0) return null;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="mt-14 scroll-mt-24"
    >
      <h2 id="reviews-heading" className="text-2xl">
        Reviews
      </h2>

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-5">
        <span className="text-4xl font-medium tabular-nums">
          {aggregate.value.toFixed(1)}
        </span>
        <div>
          <Rating value={aggregate.value} showValue={false} size={18} />
          <p className="mt-1 text-sm text-ink-muted">
            Based on {aggregate.count} review{aggregate.count === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </section>
  );
}
