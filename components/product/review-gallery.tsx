"use client";

import * as React from "react";
import { SmartImage as Image } from "@/components/ui/smart-image";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

import type { CatalogProduct } from "@/types/catalog";
import { Rating } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";
import { VerifiedIcon, ZoomIcon } from "@/components/ui/icons";
import type { ReviewProvider } from "@/components/product/reviews";

type ReviewData = Awaited<ReturnType<ReviewProvider["list"]>>;

const PAGE_SIZE = 10;

/**
 * Client-side review gallery, backed by Judge.me via /api/products/reviews.
 *
 * Server-rendered `initialData` (page 1, unfiltered) paints immediately with
 * the product page — no loading flash for the common case. Filtering by
 * star rating or paging further re-fetches from the API route, which keeps
 * the Judge.me token server-side.
 */
export function ReviewGallery({
  product,
  initialData,
}: {
  product: CatalogProduct;
  initialData: ReviewData;
}) {
  const [ratingFilter, setRatingFilter] = React.useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [photoOnly, setPhotoOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [fetchedData, setData] = React.useState(initialData);
  const [loading, setLoading] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<{ slides: { src: string }[]; index: number } | null>(
    null,
  );
  const listRef = React.useRef<HTMLDivElement>(null);

  const isFiltered = ratingFilter !== 0;
  const isDefaultView = page === 1 && !isFiltered;

  React.useEffect(() => {
    // Page 1, no rating filter is exactly what the server already fetched —
    // no re-fetch needed, so the effect below skips entirely for this case.
    if (isDefaultView) return;

    const controller = new AbortController();
    const params = new URLSearchParams({ handle: product.handle, page: String(page) });
    if (isFiltered) params.set("rating", String(ratingFilter));

    // setState deferred to a task (not called synchronously in the effect
    // body) to avoid cascading-render lint — same pattern as search-overlay.
    const task = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/products/reviews?${params}`, { signal: controller.signal })
        .then((res) => (res.ok ? (res.json() as Promise<ReviewData>) : null))
        .then((next) => {
          if (next) setData(next);
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);

    return () => {
      controller.abort();
      window.clearTimeout(task);
    };
  }, [isDefaultView, page, ratingFilter, isFiltered, product.handle]);

  // Falling back to the default view (filters cleared) shows the original
  // server-rendered page without a round trip.
  const data = isDefaultView ? initialData : fetchedData;

  const photoReviews = React.useMemo(
    () => data.reviews.filter((r) => r.attachments.length > 0),
    [data.reviews],
  );
  const visibleReviews = photoOnly ? photoReviews : data.reviews;
  const allAttachments = React.useMemo(
    () => data.reviews.flatMap((r) => r.attachments),
    [data.reviews],
  );

  const chooseRating = (star: 0 | 1 | 2 | 3 | 4 | 5) => {
    setRatingFilter((current) => (current === star ? 0 : star));
    setPage(1);
  };

  const openLightbox = (src: string) => {
    const index = allAttachments.indexOf(src);
    setLightbox({ slides: allAttachments.map((s) => ({ src: s })), index: Math.max(0, index) });
  };

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

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
        {/* Summary + star breakdown, doubles as the filter control */}
        <div className="h-fit rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-medium tabular-nums">
              {data.average.toFixed(1)}
            </span>
            <div>
              <Rating value={data.average} showValue={false} size={18} />
              <p className="mt-1 text-sm text-ink-muted">
                {data.total} review{data.total === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = data.distribution[star] ?? 0;
              const percent = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
              const active = ratingFilter === star;
              return (
                <li key={star}>
                  <button
                    type="button"
                    onClick={() => chooseRating(star)}
                    aria-pressed={active}
                    aria-label={`Filter to ${star} star reviews, ${count}`}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-1.5 py-1 text-xs transition-colors",
                      active ? "bg-accent-soft" : "hover:bg-surface-sunken",
                    )}
                  >
                    <span className="w-6 tabular-nums text-ink-muted">{star}★</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                    <span className="w-8 text-right tabular-nums text-ink-subtle">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {allAttachments.length > 0 && (
            <button
              type="button"
              onClick={() => setPhotoOnly((v) => !v)}
              aria-pressed={photoOnly}
              className={cn(
                "mt-5 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors",
                photoOnly
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-line bg-surface text-ink-muted hover:border-ink/30",
              )}
            >
              <span>With photos</span>
              <span className="tabular-nums text-ink-subtle">{photoReviews.length}</span>
            </button>
          )}

          {(isFiltered || photoOnly) && (
            <button
              type="button"
              onClick={() => {
                setRatingFilter(0);
                setPhotoOnly(false);
                setPage(1);
              }}
              className="mt-3 text-xs font-medium text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Photo strip — every customer attachment across the current page, at a glance */}
        <div ref={listRef} className="min-w-0">
          {allAttachments.length > 0 && !photoOnly && (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
              {allAttachments.slice(0, 12).map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  onClick={() => openLightbox(src)}
                  aria-label="Open customer photo"
                  className="group relative size-16 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken"
                >
                  <Image
                    src={src}
                    alt="Customer photo"
                    fill
                    sizes="64px"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>
          )}

          <ul
            className={cn(
              "divide-y divide-line transition-opacity",
              loading && "opacity-50",
            )}
          >
            {visibleReviews.map((review) => (
              <li key={review.id} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <Rating value={review.rating} showValue={false} size={14} />
                  <span className="text-sm font-medium">{review.author}</span>
                  {review.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-2xs font-semibold text-success uppercase">
                      <VerifiedIcon size={11} />
                      Verified purchase
                    </span>
                  )}
                  <time
                    dateTime={review.createdAt}
                    className="ml-auto text-xs text-ink-subtle"
                  >
                    {formatDate(review.createdAt)}
                  </time>
                </div>
                {review.title && <p className="mt-2 font-medium">{review.title}</p>}
                {review.body && (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    {review.body}
                  </p>
                )}

                {review.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.attachments.map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        onClick={() => openLightbox(src)}
                        aria-label="Open customer photo"
                        className="group relative size-20 overflow-hidden rounded-md border border-line bg-surface-sunken"
                      >
                        <Image
                          src={src}
                          alt={`Customer photo from ${review.author}'s review`}
                          fill
                          sizes="80px"
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 hidden items-center justify-center bg-black/20 group-hover:flex">
                          <ZoomIcon size={16} className="text-white" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}

            {visibleReviews.length === 0 && (
              <li className="py-8 text-sm text-ink-muted">
                {photoOnly
                  ? "No reviews with photos yet."
                  : `No reviews match this filter yet.`}
              </li>
            )}
          </ul>

          {!photoOnly && totalPages > 1 && (
            <nav
              aria-label="Reviews pagination"
              className="mt-8 flex items-center justify-between border-t border-line pt-5"
            >
              <p className="text-xs text-ink-subtle tabular-nums">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 1 || loading}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-medium disabled:pointer-events-none disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page === totalPages || loading}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-medium disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </nav>
          )}
        </div>
      </div>

      {lightbox && (
        <Lightbox
          open
          close={() => setLightbox(null)}
          index={lightbox.index}
          slides={lightbox.slides}
          plugins={[Counter, Zoom]}
        />
      )}
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
