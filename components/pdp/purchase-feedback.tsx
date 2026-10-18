"use client";

import * as React from "react";
import { LoadingImage } from "./loading-image";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./icon";
import { Stars } from "./stars";

/** The slice of a review the buy-box carousel needs (a subset of components/product/reviews' Review). */
export type FeedbackReview = {
  id: string;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
  attachments: string[];
};

const VIDEO_URL = /\.(mp4|mov|webm|m4v)(\?|$)/i;

/** Fixed locale + UTC, so the server render and the client render can never disagree. */
function formatReviewDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * "What customers say" — a review carousel in the buy box, directly beneath the
 * reassurance box: the last objection the panel has to answer is "what do other
 * people say?". A native scroll-snap strip, so touch scrolling belongs to the
 * browser and the next card peeks in from the right to hint there is more.
 *
 * Only real reviews are ever passed in (the page hands over 5★ reviews from the
 * review provider); with none, nothing renders.
 */
export function PurchaseFeedback({
  reviews,
  className,
}: {
  reviews: FeedbackReview[];
  className?: string;
}) {
  const slides = reviews.slice(0, 5);
  const count = slides.length;
  const [index, setIndex] = React.useState(0);
  const trackRef = React.useRef<HTMLUListElement>(null);

  /** Scrolls the strip so slide `i` sits centred (matches `snap-center`). */
  const go = React.useCallback(
    (i: number) => {
      const track = trackRef.current;
      const slide = track?.children[Math.max(0, Math.min(count - 1, i))] as
        | HTMLElement
        | undefined;
      if (!track || !slide) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({
        left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
        behavior: reduce ? "auto" : "smooth",
      });
    },
    [count],
  );

  /** The slide whose centre is nearest the strip's centre is the active one. */
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < track.children.length; i++) {
      const el = track.children[i] as HTMLElement;
      const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    setIndex((prev) => (prev === nearest ? prev : nearest));
  };

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What customers say"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(index - 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          go(index + 1);
        }
      }}
      className={cn("surface-float px-4 py-4 sm:px-5", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-ui text-body-sm font-medium text-ink-soft">What customers say</p>
        {count > 1 && (
          <div className="hidden items-center gap-1 sm:flex">
            <PagerArrow label="Previous review" onClick={() => go(index - 1)} flip />
            <PagerArrow label="Next review" onClick={() => go(index + 1)} />
          </div>
        )}
      </div>

      <ul
        ref={trackRef}
        onScroll={onScroll}
        aria-live="polite"
        className="hide-scrollbar mt-3 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((review, i) => {
          const photos = review.attachments.filter((src) => !VIDEO_URL.test(src)).slice(0, 3);
          return (
            <li
              key={review.id}
              aria-hidden={i !== index}
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className="flex w-[88%] shrink-0 snap-center flex-col justify-between gap-3 sm:w-full"
            >
              <div>
                <header className="flex items-baseline justify-between gap-3">
                  <p className="flex items-center gap-2">
                    <Stars value={review.rating} starClassName="size-3.5" />
                    <span className="sr-only">{review.rating} out of 5 stars</span>
                  </p>
                  <time
                    dateTime={review.createdAt.slice(0, 10)}
                    className="font-ui text-body-sm text-ink-faint tabular-nums"
                  >
                    {formatReviewDate(review.createdAt)}
                  </time>
                </header>

                {review.title && (
                  <p className="mt-2 font-serif text-body-lg font-medium">{review.title}</p>
                )}
                <p className="mt-2 line-clamp-3 text-body-sm text-ink-soft">{review.body}</p>

                {photos.length > 0 && (
                  <ul className="mt-3 flex gap-2">
                    {photos.map((src, n) => (
                      <li
                        key={`${src}-${n}`}
                        className="relative size-14 overflow-hidden rounded-lg bg-cream sm:size-16"
                      >
                        <LoadingImage
                          src={src}
                          alt={`Customer photo from ${review.author}'s review`}
                          sizes="64px"
                          spinnerClassName="size-4"
                          className="object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <footer className="flex items-center gap-2 text-body-sm">
                <span className="font-medium text-ink">{review.author}</span>
                {review.verifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-success">
                    <Icon name="check" className="size-3.5" />
                    Verified buyer
                  </span>
                )}
              </footer>
            </li>
          );
        })}
      </ul>

      {count > 1 && (
        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          {slides.map((review, i) => (
            <button
              key={review.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show review ${i + 1} of ${count}`}
              aria-current={i === index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600",
                i === index ? "w-5 bg-sage-600" : "w-1.5 bg-sage-200 hover:bg-sage-400",
              )}
            />
          ))}
        </div>
      )}

      <a
        href="#reviews"
        className="mt-3 inline-block font-ui text-body-sm font-medium text-ink link-underline"
      >
        Read all reviews
      </a>
    </section>
  );
}

function PagerArrow({
  label,
  onClick,
  flip,
}: {
  label: string;
  onClick: () => void;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-8 shrink-0 place-items-center rounded-full text-sage-700 transition-colors duration-300 hover:bg-sand hover:text-sage-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600"
    >
      <Icon name="chevron-right" className={cn("size-4", flip && "rotate-180")} />
    </button>
  );
}
