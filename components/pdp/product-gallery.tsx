"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Slide } from "yet-another-react-lightbox";
import { SmartImage as Image } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils/cn";
import type { CatalogMedia } from "@/types/catalog";
import { usePurchase } from "./purchase-context";

const GalleryLightbox = dynamic(() => import("./gallery-lightbox"), {
  ssr: false,
});

type GalleryItem = Exclude<CatalogMedia, { type: "model_3d" }>;

const stripQuery = (url: string) => url.split("?")[0];

/** Supplier imports often leave a file hash as alt text — worse than none for screen readers. */
const usableAlt = (alt: string | null) =>
  alt && !/^[0-9a-f]{24,}$/i.test(alt.trim()) ? alt : null;

/**
 * Product media gallery.
 *
 * One horizontally scroll-snapped track at every size: swipe on touch, arrow
 * keys / thumbnails on desktop. Selecting a colour scrolls to that variant's
 * photo. Only the first slide is priority-loaded; the rest are lazy.
 */
export function ProductGallery() {
  const { product, variant } = usePurchase();
  const items = React.useMemo(
    () => product.media.filter((m): m is GalleryItem => m.type !== "model_3d"),
    [product.media],
  );
  const trackRef = React.useRef<HTMLDivElement>(null);
  const videoRefs = React.useRef<Map<number, HTMLVideoElement>>(new Map());
  const [active, setActive] = React.useState(0);
  const [zoomAt, setZoomAt] = React.useState<number | null>(null);

  // Explicit navigation (thumbnail click, arrow key) — as opposed to a swipe —
  // is a clear enough signal to start a video slide playing right away
  // instead of leaving it sitting on its poster until the visitor also taps
  // the native play button. Muted, so autoplay from this click is always
  // allowed. Swiping past a video on mobile still lands paused, same as
  // scrolling past any slide.
  const scrollTo = React.useCallback((index: number, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.scrollTo({
      left: index * track.clientWidth,
      behavior: smooth && !reduce ? "smooth" : "auto",
    });
    setActive(index);
    for (const [i, videoEl] of videoRefs.current) {
      if (i === index) videoEl.play().catch(() => {});
      else videoEl.pause();
    }
  }, []);

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

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (index === active) return;
    setActive(index);
    // A swipe (unlike a thumbnail/arrow click, via scrollTo) doesn't
    // autoplay the slide it lands on, but it should still stop a video
    // that's been scrolled away from.
    videoRefs.current.get(active)?.pause();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight")
      scrollTo(Math.min(items.length - 1, active + 1));
    if (event.key === "ArrowLeft") scrollTo(Math.max(0, active - 1));
  };

  // Native scroll-snap lets a fast flick carry momentum through more than one
  // slide before it decelerates — it only guarantees landing *on* a snap
  // point, not on the *next* one. Tracking the touch ourselves and always
  // stepping by exactly one keeps a swipe to one slide per gesture, like a
  // native app carousel, while a trackpad/mouse-wheel scroll (no touch
  // events) still falls back to the track's own scroll-snap.
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);
  const dragging = React.useRef(false);
  const SWIPE_THRESHOLD_PX = 40;

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
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
    // doesn't also scroll the track (which is what causes the multi-slide
    // flick) or the page vertically.
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
    if (dx <= -SWIPE_THRESHOLD_PX) scrollTo(Math.min(items.length - 1, active + 1));
    else if (dx >= SWIPE_THRESHOLD_PX) scrollTo(Math.max(0, active - 1));
    // Otherwise a tap or too-short a drag — leave the slide as it is.
  };

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

  if (items.length === 0) {
    return (
      <div
        className="aspect-square w-full rounded-2xl bg-surface-sunken"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="lg:grid lg:max-w-160 lg:grid-cols-[4.75rem_1fr] lg:gap-3">
      {/* Thumbnail rail — desktop only, beside the main image; mobile gets its
          own horizontal strip below the main image instead (further down). */}
      {/* h-0 + min-h-full: the rail takes the main image's height instead of
          growing the row, and scrolls (scrollbar hidden) when there are more
          thumbs than fit. p-1 leaves room for the selected thumb's ring +
          offset, which the scroll container would otherwise clip. */}
      <ul
        className="hidden h-0 min-h-full flex-col gap-2.5 overflow-y-auto p-1 hide-scrollbar lg:flex"
        aria-label="Product media"
      >
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => scrollTo(index)}
              aria-label={`Show ${item.type === "image" ? "image" : "video"} ${index + 1} of ${items.length}`}
              aria-current={index === active}
              className={cn(
                "relative block aspect-square w-full cursor-pointer overflow-hidden rounded-md bg-surface-sunken ring-offset-2 ring-offset-canvas transition",
                index === active
                  ? "ring-2 ring-ink"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={thumbOf(item)}
                alt=""
                fill
                sizes="72px"
                className="object-cover"
              />
              {item.type !== "image" && <PlayBadge small />}
            </button>
          </li>
        ))}
      </ul>

      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={`${product.title} media, ${active + 1} of ${items.length}`}
          // touch-action: pan-y (via touch-pan-y) stops the browser's own
          // horizontal scroll-snap from also reacting to the same swipe —
          // that's what let a fast flick carry through more than one slide.
          // Horizontal movement is driven entirely by the touch handlers
          // above now; vertical page scroll still passes through untouched.
          className="flex snap-x snap-mandatory touch-pan-y overflow-x-auto overscroll-x-contain bg-surface-sunken scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-2 lg:rounded-2xl [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              className="relative aspect-square w-full shrink-0 snap-center"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${items.length}`}
            >
              {item.type === "video" ? (
                <video
                  ref={(element) => {
                    if (element) videoRefs.current.set(index, element);
                    else videoRefs.current.delete(index);
                  }}
                  // cover fills the square slide; fullscreen switches to
                  // contain so the whole frame shows instead of a crop.
                  className="size-full object-cover [&:fullscreen]:object-contain [&:-webkit-full-screen]:object-contain"
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
              ) : (
                <button
                  type="button"
                  onClick={() => setZoomAt(index)}
                  className="block size-full cursor-zoom-in"
                  aria-label={`Zoom image ${index + 1}`}
                >
                  <Image
                    src={
                      item.type === "image" ? item.url : (item.previewUrl ?? "")
                    }
                    alt={
                      usableAlt(item.altText) ??
                      `${product.title} — view ${index + 1}`
                    }
                    fill
                    // The LCP image must paint from the server HTML, not wait for
                    // hydration to lift the shimmer's opacity-0.
                    showLoader={index !== 0}
                    loading={index === 0 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-contain"
                  />
                </button>
              )}
            </div>
          ))}
        </div>

        <span className="pointer-events-none absolute top-3 right-3 hidden rounded-full bg-surface/90 px-3 py-1 text-xs font-medium text-ink-muted backdrop-blur lg:block">
          Click to zoom
        </span>
      </div>

      {/* Mobile thumbnail strip — below the main image; swipe still works on
          the track above, this just adds tap-to-jump like the desktop rail. */}
      <ul
        className="mt-2.5 flex gap-2 overflow-x-auto p-1 hide-scrollbar lg:hidden"
        aria-label="Product media"
      >
        {items.map((item, index) => (
          <li key={item.id} className="shrink-0">
            <button
              type="button"
              onClick={() => scrollTo(index)}
              aria-label={`Show ${item.type === "image" ? "image" : "video"} ${index + 1} of ${items.length}`}
              aria-current={index === active}
              className={cn(
                "relative block size-14 cursor-pointer overflow-hidden rounded-md bg-surface-sunken ring-offset-2 ring-offset-canvas transition",
                index === active
                  ? "ring-2 ring-ink"
                  : "opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={thumbOf(item)}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
              {item.type !== "image" && <PlayBadge small />}
            </button>
          </li>
        ))}
      </ul>

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
    </div>
  );
}

function thumbOf(item: GalleryItem): string {
  return item.type === "image" ? item.url : (item.previewUrl ?? "");
}

function PlayBadge({ small }: { small?: boolean }) {
  return (
    <span className="absolute inset-0 grid place-items-center bg-ink/20">
      <svg
        width={small ? 16 : 28}
        height={small ? 16 : 28}
        viewBox="0 0 24 24"
        fill="white"
        aria-hidden="true"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}
