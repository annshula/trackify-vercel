"use client";

import * as React from "react";
import { LoadingImage } from "@/components/pdp/loading-image";
import { Icon } from "@/components/pdp/icon";
import { Stars } from "@/components/pdp/stars";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

import type { CatalogProduct } from "@/types/catalog";
import { cn } from "@/lib/utils/cn";
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
  // Flat photo list across the current page, in review order — powers the
  // lightbox so opening one review's photo lets you arrow through every
  // photo on the page, not just that review's own attachments.
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
  const from = data.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, data.total);
  const fiveStarPercent = data.total
    ? Math.round(((data.distribution[5] ?? 0) / data.total) * 100)
    : 0;

  type ChipId = "all" | "photo" | 1 | 2 | 3 | 4 | 5;
  const chips: { id: ChipId; label: string; count: number; camera?: boolean }[] = [
    { id: "all", label: "All reviews", count: data.total },
    ...(allAttachments.length > 0
      ? [{ id: "photo" as const, label: "With photos", count: photoReviews.length, camera: true }]
      : []),
    ...([5, 4, 3, 2, 1] as const).map((star) => ({
      id: star,
      label: `${star} star${star === 1 ? "" : "s"}`,
      count: data.distribution[star] ?? 0,
    })),
  ];
  const activeChip: ChipId = photoOnly ? "photo" : isFiltered ? ratingFilter : "all";

  const chooseChip = (id: ChipId) => {
    if (id === "all") {
      setRatingFilter(0);
      setPhotoOnly(false);
      setPage(1);
    } else if (id === "photo") {
      setPhotoOnly((v) => !v);
    } else {
      setPhotoOnly(false);
      chooseRating(id);
    }
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goTo = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-24 pb-12 lg:pb-16">
      <div className="container-page">
        <h2
          id="reviews-heading"
          className="mb-6 text-center font-pdp-heading text-heading-1 font-semibold"
        >
          Reviews
        </h2>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-12">
          {/* ── Aggregate ───────────────────────────────────────────────── */}
          <aside
            aria-label="Rating summary"
            className="surface h-fit p-7 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start"
          >
            <div className="flex items-baseline gap-2">
              <p className="font-serif text-heading-1 leading-none font-light">
                {data.average.toFixed(1)}
              </p>
              <p className="font-ui text-body-sm text-ink-faint">/ 5</p>
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-2">
              <Stars value={data.average} />
              <span className="font-ui text-body-sm text-ink-soft tabular-nums">
                {data.total.toLocaleString("en-US")} review{data.total === 1 ? "" : "s"}
              </span>
            </p>
            <p className="mt-3 text-body-sm text-ink-soft">
              <strong className="font-numeral font-semibold text-ink tabular-nums">
                {fiveStarPercent}%
              </strong>{" "}
              rated it 5 stars.
            </p>

            <ul className="mt-6 flex flex-col gap-0.5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const n = data.distribution[star] ?? 0;
                const percent = data.total > 0 ? Math.round((n / data.total) * 100) : 0;
                const active = ratingFilter === star && !photoOnly;
                return (
                  <li key={star}>
                    <button
                      type="button"
                      onClick={() => chooseChip(star)}
                      aria-pressed={active}
                      aria-label={`Show ${star} star reviews — ${n} of ${data.total}`}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-control px-2 py-2 font-ui text-body-sm transition-colors duration-200",
                        active ? "bg-sage-100" : "hover:bg-cream",
                      )}
                    >
                      <span className="flex w-10 shrink-0 items-center gap-1 tabular-nums">
                        {star}
                        <Icon
                          name="star"
                          className="size-3.5 fill-current text-gold-500"
                          strokeWidth={1}
                        />
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand" aria-hidden="true">
                        <span
                          className="block h-full rounded-full bg-sage-600"
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                      <span className="w-10 shrink-0 text-right font-numeral text-ink-soft tabular-nums">
                        {n}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* ── Feed ────────────────────────────────────────────────────── */}
          <div ref={listRef} className="scroll-mt-[calc(var(--header-h)+2rem)]">
            <div role="group" aria-label="Filter reviews" className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => {
                const active = activeChip === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => chooseChip(chip.id)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-2 rounded-control px-4 font-ui text-body-sm font-medium transition-colors duration-200",
                      active
                        ? "bg-sage-600 text-ivory"
                        : "bg-porcelain text-ink-soft shadow-soft hover:bg-sand hover:text-ink",
                    )}
                  >
                    {chip.camera && <Icon name="camera" className="size-4" />}
                    {chip.label}
                    <span className={cn("font-numeral tabular-nums", active ? "text-ivory/70" : "text-ink-faint")}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <p aria-live="polite" className="mt-6 font-ui text-body-sm text-ink-faint tabular-nums">
              {visibleReviews.length === 0
                ? "No reviews match this filter."
                : photoOnly
                  ? `Showing ${visibleReviews.length} review${visibleReviews.length === 1 ? "" : "s"} with photos`
                  : `Showing ${from}–${to} of ${data.total.toLocaleString("en-US")} reviews`}
            </p>

            {visibleReviews.length === 0 ? (
              <div className="mt-4 rounded-card bg-cream px-6 py-14 text-center">
                <p className="font-medium">No reviews match this filter yet.</p>
                <p className="mx-auto mt-2 max-w-sm text-body-sm text-ink-soft">
                  Try another star rating, or go back to the full list.
                </p>
                <button type="button" className="btn-secondary mt-6" onClick={() => chooseChip("all")}>
                  Show all reviews
                </button>
              </div>
            ) : (
              <ul
                aria-busy={loading}
                className={cn(
                  "mt-4 flex flex-col gap-4 transition-opacity duration-200",
                  loading && "pointer-events-none opacity-50",
                )}
              >
                {visibleReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} onOpenPhoto={openLightbox} />
                ))}
              </ul>
            )}

            {!photoOnly && totalPages > 1 && (
              <nav
                aria-label="Reviews pagination"
                className="mt-8 flex flex-wrap items-center justify-end gap-1.5"
              >
                <PageButton label="Previous page" disabled={page === 1 || loading} onClick={() => goTo(page - 1)}>
                  <Icon name="chevron-right" className="size-4 rotate-180" />
                </PageButton>
                {pageWindow(page, totalPages).map((entry, i) =>
                  entry === "…" ? (
                    <span
                      key={`gap-${i}`}
                      aria-hidden="true"
                      className="grid size-10 place-items-center font-ui text-body-sm text-ink-faint"
                    >
                      …
                    </span>
                  ) : (
                    <PageButton
                      key={entry}
                      label={`Page ${entry}`}
                      current={entry === page}
                      disabled={loading}
                      onClick={() => goTo(entry)}
                    >
                      {entry}
                    </PageButton>
                  ),
                )}
                <PageButton
                  label="Next page"
                  disabled={page === totalPages || loading}
                  onClick={() => goTo(page + 1)}
                >
                  <Icon name="chevron-right" className="size-4" />
                </PageButton>
              </nav>
            )}
          </div>
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

/* ─────────────────────────────── pieces ─────────────────────────────── */

type ReviewItem = ReviewData["reviews"][number];

function ReviewCard({
  review,
  onOpenPhoto,
}: {
  review: ReviewItem;
  onOpenPhoto: (src: string) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const long = review.body.length > 280;
  const photos = review.attachments.filter((src) => !/\.(mp4|mov|webm|m4v)(\?|$)/i.test(src));

  return (
    <li>
      <article className="surface p-6 md:p-7">
        <header className="flex items-baseline justify-between gap-3">
          <p className="flex items-center gap-2">
            <Stars value={review.rating} />
            <span className="sr-only">{review.rating} out of 5 stars</span>
          </p>
          <time
            dateTime={review.createdAt}
            className="font-ui text-body-sm text-ink-faint tabular-nums"
          >
            {formatDate(review.createdAt)}
          </time>
        </header>

        {review.title && <p className="mt-4 font-serif text-body-lg">{review.title}</p>}
        {review.body && (
          <p
            className={cn(
              "max-w-[68ch] text-body-sm text-ink-soft",
              review.title ? "mt-1.5" : "mt-4",
              !expanded && "line-clamp-4",
            )}
          >
            {review.body}
          </p>
        )}
        {long && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-1 font-ui text-body-sm font-medium text-ink link-underline"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        {photos.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {photos.map((src, i) => (
              <li key={`${src}-${i}`}>
                <button
                  type="button"
                  onClick={() => onOpenPhoto(src)}
                  aria-label="Open customer photo"
                  className="relative block size-20 overflow-hidden rounded-xl bg-cream"
                >
                  <LoadingImage
                    src={src}
                    alt={`Customer photo from ${review.author}'s review`}
                    sizes="80px"
                    spinnerClassName="size-4"
                    className="object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className="mt-5 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-sage-100 font-ui text-body-sm font-semibold text-sage-700 uppercase"
          >
            {review.author.trim().charAt(0) || "?"}
          </span>
          <p className="min-w-0 leading-tight">
            <span className="flex items-center gap-1.5 font-ui text-body-sm font-semibold">
              {review.author}
              {review.verifiedPurchase && (
                <span
                  className="grid size-4 place-items-center rounded-full bg-success text-white"
                  title="Verified purchase"
                >
                  <Icon name="check" className="size-2.5" strokeWidth={3} />
                  <span className="sr-only">Verified purchase</span>
                </span>
              )}
            </span>
            {review.verifiedPurchase && (
              <span className="text-[0.72rem] text-ink-soft">Verified buyer</span>
            )}
          </p>
        </footer>
      </article>
    </li>
  );
}

function PageButton({
  label,
  children,
  onClick,
  current = false,
  disabled = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  current?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={cn(
        "grid size-10 place-items-center rounded-control font-ui text-body-sm font-medium transition-colors duration-200",
        current
          ? "bg-sage-600 text-ivory"
          : "bg-porcelain text-ink-soft shadow-soft hover:bg-sand hover:text-ink",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      {children}
    </button>
  );
}

/** Numeric page window with ellipsis gaps — e.g. [1, "…", 12, 13, 14, "…", 66]. */
function pageWindow(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [];
  const push = (entry: number | "…") => {
    if (out[out.length - 1] !== entry) out.push(entry);
  };
  push(1);
  if (page > 4) push("…");
  for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i += 1) push(i);
  if (page < total - 3) push("…");
  push(total);
  return out;
}

/** Same year → "Oct 17"; otherwise "Oct 17, 2025". Fixed locale + UTC so server and client agree. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
