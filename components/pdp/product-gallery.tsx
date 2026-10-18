"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Slide } from "yet-another-react-lightbox";
import { LoadingImage } from "./loading-image";
import { cn } from "@/lib/utils/cn";
import type { CatalogMedia } from "@/types/catalog";
import { Icon } from "./icon";
import { usePurchase } from "./purchase-context";

const GalleryLightbox = dynamic(() => import("./gallery-lightbox"), {
  ssr: false,
});

type GalleryItem = Exclude<CatalogMedia, { type: "model_3d" }>;

const stripQuery = (url: string) => url.split("?")[0];

/** Supplier imports often leave a file hash as alt text — worse than none for screen readers. */
const usableAlt = (alt: string | null) =>
  alt && !/^[0-9a-f]{24,}$/i.test(alt.trim()) ? alt : null;

/** Horizontal travel before a touch gesture counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD_PX = 40;

/**
 * PDP gallery — a sticky stage with the thumbnails beside it
 * from lg up (a vertical rail on the stage's left) and beneath it on phones (a
 * horizontal rail).
 *
 *  - The stage is a native horizontally scroll-snapped track, so the browser's
 *    own scroll engine drives the transition and a slide can never render blank
 *    mid-animation.
 *  - Touch is tracked ourselves only to stop a fast flick carrying momentum
 *    through more than one slide; arrows, ←/→ keys and the rail go straight to
 *    a slide.
 *  - From lg up the stage is `--gallery-h` tall and sticks to mid-viewport, so
 *    it stays level with the purchase column as you scroll.
 *  - The first slide is priority-loaded; every other slide shows a spinner over
 *    its reserved space until it has painted.
 *  - Choosing a colour/style in the purchase panel brings that variant's photo
 *    to the stage.
 */
export function ProductGallery() {
  const { product, variant } = usePurchase();
  const items = React.useMemo(
    () => product.media.filter((m): m is GalleryItem => m.type !== "model_3d"),
    [product.media],
  );
  const count = items.length;
  // The slide the default variant lands on is the real above-the-fold image, so it
  // is preloaded alongside slide 0 (the gallery scrolls to it after hydration).
  const [initialIndex] = React.useState(() => {
    const image = variant?.imageId ? product.images.find((img) => img.id === variant.imageId) : null;
    if (!image) return 0;
    const index = items.findIndex(
      (m) => m.type === "image" && stripQuery(m.url) === stripQuery(image.url),
    );
    return Math.max(0, index);
  });
  const trackRef = React.useRef<HTMLDivElement>(null);
  const thumbsRef = React.useRef<HTMLUListElement>(null);
  const videoRefs = React.useRef<Map<number, HTMLVideoElement>>(new Map());
  const [active, setActive] = React.useState(0);
  const [zoomAt, setZoomAt] = React.useState<number | null>(null);

  // Explicit navigation (thumbnail click, arrow key) — as opposed to a swipe —
  // is a clear enough signal to start a video slide playing right away instead
  // of leaving it on its poster. Muted, so autoplay from this click is always
  // allowed. Swiping past a video still lands paused.
  const scrollTo = React.useCallback(
    (index: number, smooth = true) => {
      const track = trackRef.current;
      if (!track) return;
      const i = Math.max(0, Math.min(count - 1, index));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({
        left: i * track.clientWidth,
        behavior: smooth && !reduce ? "smooth" : "auto",
      });
      setActive(i);
      for (const [n, videoEl] of videoRefs.current) {
        if (n === i) videoEl.play().catch(() => {});
        else videoEl.pause();
      }
    },
    [count],
  );

  // Variant image ids are ProductImage ids; media ids are MediaImage ids — match on URL.
  React.useEffect(() => {
    if (!variant?.imageId) return;
    const image = product.images.find((img) => img.id === variant.imageId);
    if (!image) return;
    const index = items.findIndex(
      (m) => m.type === "image" && stripQuery(m.url) === stripQuery(image.url),
    );
    if (index >= 0) scrollTo(index);
  }, [variant?.imageId, product.images, items, scrollTo]);

  // Track the visible slide as the user scrolls/swipes the track directly
  // (trackpad, mouse wheel, or a swipe that native snap already resolved).
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    if (index === active) return;
    setActive(index);
    // A swipe doesn't autoplay the slide it lands on, but it should still stop
    // a video that's been scrolled away from.
    videoRefs.current.get(active)?.pause();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") scrollTo(active + 1);
    if (event.key === "ArrowLeft") scrollTo(active - 1);
  };

  // Native scroll-snap only guarantees landing *on* a snap point, not the
  // *next* one — tracking touch ourselves and stepping by exactly one keeps a
  // swipe to one slide per gesture, like a native app carousel. A trackpad or
  // mouse-wheel scroll (no touch events) still falls back to the track's snap.
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);
  const dragging = React.useRef(false);

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch || count < 2) return;
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    dragging.current = false;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    const start = touchStart.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Once it's clearly a horizontal drag, own the gesture so the browser
    // doesn't also scroll the track or the page vertically.
    if (!dragging.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      dragging.current = true;
    }
    if (dragging.current) event.preventDefault();
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    const touch = event.changedTouches[0];
    touchStart.current = null;
    if (!start || !touch || !dragging.current) return;
    dragging.current = false;
    const dx = touch.clientX - start.x;
    if (dx <= -SWIPE_THRESHOLD_PX) scrollTo(active + 1);
    else if (dx >= SWIPE_THRESHOLD_PX) scrollTo(active - 1);
  };

  // Keep the active thumbnail in view — scroll the rail only, never the page.
  // The rail is horizontal on phones and vertical from lg up, so the axis is
  // read from the rail itself instead of assumed.
  React.useEffect(() => {
    const rail = thumbsRef.current;
    const thumb = rail?.children[active] as HTMLElement | undefined;
    if (!rail || !thumb) return;
    const railBox = rail.getBoundingClientRect();
    const box = thumb.getBoundingClientRect();
    if (rail.scrollHeight > rail.clientHeight + 1) {
      if (box.top < railBox.top)
        rail.scrollBy({ top: box.top - railBox.top - 8, behavior: "smooth" });
      else if (box.bottom > railBox.bottom)
        rail.scrollBy({ top: box.bottom - railBox.bottom + 8, behavior: "smooth" });
    } else {
      if (box.left < railBox.left)
        rail.scrollBy({ left: box.left - railBox.left - 8, behavior: "smooth" });
      else if (box.right > railBox.right)
        rail.scrollBy({ left: box.right - railBox.right + 8, behavior: "smooth" });
    }
  }, [active]);

  const slides: Slide[] = items.map((m) =>
    m.type === "image"
      ? {
          src: m.url,
          alt: usableAlt(m.altText) ?? product.title,
          width: m.width ?? undefined,
          height: m.height ?? undefined,
        }
      : m.type === "video"
        ? {
            type: "video",
            poster: m.previewUrl ?? undefined,
            sources: m.sources.map((s) => ({ src: s.url, type: s.mimeType })),
          }
        : { src: m.previewUrl ?? "", alt: m.altText ?? product.title },
  );

  if (count === 0) {
    return (
      <div
        className="aspect-square w-full rounded-media"
        aria-hidden="true"
      />
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={`${product.title} images and video`}
      /* Stuck to the middle of the viewport: the stage is `--gallery-h` tall,
         so half of what is left over sits above it and half below. */
      className="min-w-0 lg:sticky lg:top-[calc((100svh-var(--gallery-h))/2)] lg:self-start"
      onKeyDown={onKeyDown}
    >
      {/* Reversed on lg so the rail — which stays after the stage in the DOM,
          keeping the stage first for keyboard and screen-reader order — lands
          to its left. */}
      <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
        <div className="group/stage relative min-w-0 flex-1">
          <div
            ref={trackRef}
            onScroll={onScroll}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            aria-live="polite"
            // touch-pan-y stops the browser's own horizontal scroll-snap from
            // also reacting to the same swipe; horizontal movement is driven by
            // the touch handlers above, vertical page scroll passes through.
            className="hide-scrollbar flex snap-x snap-mandatory touch-pan-y overflow-x-auto overscroll-x-contain rounded-media [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, i) => (
              <div
                key={item.id}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={i !== active}
                className="w-full shrink-0 snap-center"
              >
                {item.type === "video" ? (
                  <div className="relative aspect-square w-full overflow-hidden bg-ink lg:aspect-auto lg:h-(--gallery-h)">
                    <video
                      ref={(element) => {
                        if (element) videoRefs.current.set(i, element);
                        else videoRefs.current.delete(i);
                      }}
                      className="absolute inset-0 size-full bg-ink object-contain"
                      controls
                      playsInline
                      muted
                      preload="none"
                      poster={item.previewUrl ?? undefined}
                    >
                      {item.sources.map((s) => (
                        <source key={s.url} src={s.url} type={s.mimeType} />
                      ))}
                    </video>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setZoomAt(i)}
                    aria-label={`Zoom image ${i + 1}`}
                    className="relative block aspect-square w-full cursor-zoom-in overflow-hidden lg:aspect-auto lg:h-(--gallery-h)"
                  >
                    <LoadingImage
                      src={item.type === "image" ? item.url : (item.previewUrl ?? "")}
                      alt={usableAlt(item.altText) ?? `${product.title} — view ${i + 1}`}
                      priority={i === 0 || i === initialIndex}
                      fetchPriority={i === initialIndex ? "high" : undefined}
                      sizes="(min-width: 1024px) 52vw, 100vw"
                      className="object-contain"
                    />
                  </button>
                )}
              </div>
            ))}
          </div>

          {count > 1 && (
            <>
              <div className="glass pointer-events-none absolute bottom-4 left-4 rounded-tag px-3 py-1.5 text-[0.78rem] tabular-nums">
                {active + 1} / {count}
              </div>
              <div className="absolute right-4 bottom-4 hidden gap-2 md:flex">
                <button
                  type="button"
                  onClick={() => scrollTo(active - 1)}
                  disabled={active === 0}
                  className="glass grid size-11 place-items-center rounded-[12px] transition-opacity disabled:opacity-40"
                  aria-label="Previous image"
                >
                  <Icon name="arrow-right" className="size-4 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo(active + 1)}
                  disabled={active === count - 1}
                  className="glass grid size-11 place-items-center rounded-[12px] transition-opacity disabled:opacity-40"
                  aria-label="Next image"
                >
                  <Icon name="arrow-right" className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {count > 1 && (
          /* Horizontal snap row under the stage on phones; a vertical scroller
             on its left from lg up, as tall as the stage it sits beside. */
          <ul
            ref={thumbsRef}
            className="hide-scrollbar flex w-full snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain p-0.5 [&::-webkit-scrollbar]:hidden lg:max-h-(--gallery-h) lg:w-22 lg:shrink-0 lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:p-0"
            aria-label="Choose image"
          >
            {items.map((item, i) => (
              <li key={item.id} className="shrink-0 snap-start">
                <button
                  type="button"
                  onClick={() => scrollTo(i)}
                  aria-label={`Show ${item.type === "video" ? "video" : "image"} ${i + 1} of ${count}`}
                  aria-current={i === active}
                  className={cn(
                    "relative block size-19 overflow-hidden rounded-[14px] transition-[box-shadow,opacity] duration-300 md:size-22",
                    i === active
                      ? "shadow-[inset_0_0_0_1.5px_var(--color-ink)]"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <LoadingImage
                    src={thumbOf(item)}
                    alt=""
                    sizes="88px"
                    spinnerClassName="size-5"
                    className="object-cover"
                  />
                  {item.type !== "image" && (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="glass grid size-7 place-items-center rounded-full">
                        <Icon name="play" className="size-3 translate-x-px" />
                      </span>
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {zoomAt !== null && (
        <GalleryLightbox
          slides={slides}
          index={zoomAt}
          onClose={(index) => {
            setZoomAt(null);
            scrollTo(index, false);
          }}
        />
      )}
    </section>
  );
}

function thumbOf(item: GalleryItem): string {
  return item.type === "image" ? item.url : (item.previewUrl ?? "");
}
