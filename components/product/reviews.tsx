import type { CatalogProduct } from "@/types/catalog";
import { Rating } from "@/components/ui/primitives";
import { productRating } from "@/lib/catalog/selectors";

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
 * review. `ReviewProvider` below is the integration seam.
 */

export type Review = {
  id: string;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
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
 * No provider is wired by default.
 *
 * To connect one, implement ReviewProvider against your review app's API in
 * `services/reviews/<provider>.ts` and export it here. The UI below then
 * renders real data with no further changes.
 */
export const reviewProvider: ReviewProvider | null = null;

export async function Reviews({ product }: { product: CatalogProduct }) {
  const aggregate = productRating(product);

  if (reviewProvider) {
    const data = await reviewProvider.list(product.handle);
    // No reviews from the provider — hide the whole section.
    if (data.total === 0) return null;
    return <ReviewList product={product} data={data} />;
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

function ReviewList({
  product,
  data,
}: {
  product: CatalogProduct;
  data: Awaited<ReturnType<ReviewProvider["list"]>>;
}) {
  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="mt-14 scroll-mt-24"
    >
      <h2 id="reviews-heading" className="text-2xl">
        Reviews
      </h2>

      <div className="mt-4 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-medium tabular-nums">
              {data.average.toFixed(1)}
            </span>
            <div>
              <Rating value={data.average} showValue={false} size={18} />
              <p className="mt-1 text-sm text-ink-muted">
                {data.total} reviews
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = data.distribution[star] ?? 0;
              const percent =
                data.total > 0 ? Math.round((count / data.total) * 100) : 0;
              return (
                <li key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-6 tabular-nums text-ink-muted">
                    {star}★
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="w-8 text-right tabular-nums text-ink-subtle">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <ul className="divide-y divide-line">
          {data.reviews.map((review) => (
            <li key={review.id} className="py-5 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <Rating value={review.rating} showValue={false} size={14} />
                <span className="text-sm font-medium">{review.author}</span>
                {review.verifiedPurchase && (
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-2xs font-semibold text-success uppercase">
                    Verified purchase
                  </span>
                )}
                <time
                  dateTime={review.createdAt}
                  className="ml-auto text-xs text-ink-subtle"
                >
                  {new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </div>
              {review.title && (
                <p className="mt-2 font-medium">{review.title}</p>
              )}
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                {review.body}
              </p>
            </li>
          ))}
          {data.reviews.length === 0 && (
            <li className="py-8 text-sm text-ink-muted">
              No reviews yet for {product.title}. Be the first once you have
              received your order.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}
