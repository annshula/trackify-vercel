"use client";

import * as React from "react";
import Image from "next/image";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Video from "yet-another-react-lightbox/plugins/video";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

import { cn } from "@/lib/utils/cn";
import { useDragScroll } from "@/hooks/use-drag-scroll";
import { BLUR_DATA_URL, imageAlt } from "@/lib/utils/image";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  ZoomIcon,
} from "@/components/ui/icons";
import type { CatalogMedia, CatalogProduct } from "@/types/catalog";

/**
 * Product gallery.
 *
 * Sizing follows the large-marketplace convention (Amazon et al): the stage is
 * height-capped and the image is *contained*, never cropped. An aspect-ratio
 * box is the wrong tool for a product column — at a ~780px-wide desktop column
 * a 4:5 box renders a ~975px-tall image that swallows the viewport and pushes
 * the buy box below the fold. A fixed cap keeps product, price and CTA visible
 * together at every width.
 *
 * Mobile is a native scroll-snap carousel — momentum, rubber-banding and
 * accessibility come free, and it costs no JS to drag. Tapping any image opens
 * the full-screen lightbox.
 */
export function ProductGallery({
  product,
  activeMediaId,
  onActiveChange,
}: {
  product: CatalogProduct;
  activeMediaId?: string | null;
  onActiveChange?: (mediaId: string) => void;
}) {
  const media =
    product.media.length > 0 ? product.media : imagesAsMedia(product);
  const [index, setIndex] = React.useState(0);
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const trackRef = React.useRef<HTMLDivElement>(null);

  /*
   * `index` is the single source of truth for which slide is shown. It changes
   * from four places — a variant selection, a thumbnail/arrow click, the user
   * swiping, and the lightbox — so it is state rather than a derivation.
   *
   * A variant change is folded in during render (React's documented pattern for
   * reacting to a changed prop). A single effect then syncs the DOM scroll
   * position to `index`, which is exactly what effects are for: pushing React
   * state out to an external system.
   */
  const [appliedMediaId, setAppliedMediaId] = React.useState(activeMediaId);

  if (activeMediaId !== appliedMediaId) {
    setAppliedMediaId(activeMediaId);
    if (activeMediaId) {
      let target = media.findIndex((item) => item.id === activeMediaId);
      // Variant images use ProductImage ids, but the slides come from the media
      // connection (MediaImage ids). Bridge the same underlying photo by URL so
      // selecting a color shows its image in the main area.
      if (target < 0) {
        const productImage = product.images.find(
          (image) => image.id === activeMediaId,
        );
        if (productImage) {
          target = media.findIndex(
            (item) => item.type === "image" && item.url === productImage.url,
          );
        }
      }
      if (target >= 0 && target !== index) setIndex(target);
    }
  }

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;

    // Already there (the user just swiped here) — do not fight their gesture.
    if (Math.round(track.scrollLeft / track.clientWidth) === index) return;

    const child = track.children[index] as HTMLElement | undefined;
    if (child) track.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  }, [index]);

  const scrollTo = React.useCallback((next: number) => setIndex(next), []);

  // Keep the active indicator honest while the user swipes.
  const onScroll = React.useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;

    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next < 0 || next >= media.length) return;

    setIndex((current) => {
      if (current === next) return current;
      const item = media[next];
      if (item) onActiveChange?.(item.id);
      return next;
    });
  }, [media, onActiveChange]);

  const slides = React.useMemo(() => media.map(toSlide), [media]);
  const thumbStripRef = useDragScroll<HTMLUListElement>();

  if (media.length === 0) {
    return (
      <div
        className="h-[min(92vw,360px)] w-full bg-surface-sunken lg:h-125 lg:rounded-2xl"
        role="img"
        aria-label="No product image available"
      />
    );
  }

  const current = media[index];

  return (
    <div className="flex flex-col gap-2.5">
      {/* Main stage */}
      <div className="relative min-w-0">
        <div
          ref={trackRef}
          onScroll={onScroll}
          // Square corners edge-to-edge on mobile so it reads as a native image
          // viewer; a flat rounded frame once the layout has margins at lg.
          className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-surface lg:overflow-hidden lg:rounded-2xl"
          role="group"
          aria-roledescription="carousel"
          aria-label={`${product.title} images`}
        >
          {media.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setZoomOpen(true)}
              // Height-capped rather than aspect-ratio driven — see the note at
              // the top of this file.
              className="relative h-[min(92vw,360px)] w-full shrink-0 cursor-zoom-in snap-center snap-always lg:hidden"
              aria-label={`View ${product.title} image ${itemIndex + 1} full screen`}
            >
              <MediaFrame
                item={item}
                product={product}
                priority={itemIndex === 0}
                fit="cover"
                // Only the slide currently scrolled into view should play —
                // every slide is mounted at once in this carousel, so without
                // this a video would sit paused until manually pressed.
                active={itemIndex === index}
              />
            </button>
          ))}

          {/* Desktop shows one frame; the strip below drives it. */}
          {current && (
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label={`Zoom ${product.title} image ${index + 1}`}
              className="relative hidden h-125 w-full cursor-zoom-in lg:block"
            >
              <MediaFrame item={current} product={product} priority active />
              <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-lg bg-canvas/90 text-ink backdrop-blur-sm">
                <ZoomIcon size={17} />
              </span>
            </button>
          )}
        </div>

        {media.length > 1 && (
          <>
            {/* Counter pill instead of dots — exact, and it stays legible with
                any number of images where a dot row would wrap. Sits at the
                top: the buy-box sheet below overlaps this stage's bottom
                edge on mobile (-mt-6, see buy-box.tsx), which would cover a
                bottom-anchored pill entirely. */}
            <div className="pointer-events-none absolute top-3 right-3 rounded-full bg-ink/70 px-2.5 py-1 text-2xs font-medium text-white tabular-nums backdrop-blur-sm lg:hidden">
              {index + 1} / {media.length}
            </div>

            <div className="pointer-events-none absolute inset-y-0 hidden w-full items-center justify-between px-3 lg:flex">
              <GalleryArrow
                direction="prev"
                disabled={index === 0}
                onClick={() => scrollTo(Math.max(0, index - 1))}
              />
              <GalleryArrow
                direction="next"
                disabled={index === media.length - 1}
                onClick={() => scrollTo(Math.min(media.length - 1, index + 1))}
              />
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip — horizontal under the stage, which keeps the image
          column as wide as possible rather than surrendering 80px to a rail. */}
      {media.length > 1 && (
        <ul
          ref={thumbStripRef}
          className="hide-scrollbar hidden gap-2 overflow-x-auto lg:flex lg:cursor-grab"
        >
          {media.map((item, itemIndex) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  scrollTo(itemIndex);
                  onActiveChange?.(item.id);
                }}
                aria-label={`Show image ${itemIndex + 1} of ${media.length}`}
                aria-current={itemIndex === index}
                className={cn(
                  // A border rather than an offset ring: this strip is a
                  // horizontal scroll container, and `ring-offset` paints
                  // outside the border box where the container clips it.
                  // A border sits inside the box, so it is never cut off.
                  "relative size-16 overflow-hidden rounded-lg border-2 bg-surface transition-[border-color,opacity] duration-200",
                  itemIndex === index
                    ? "border-ink opacity-100"
                    : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <ThumbFrame item={item} product={product} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        open={zoomOpen}
        close={() => setZoomOpen(false)}
        slides={slides}
        index={index}
        on={{
          // Keep the inline gallery in step with the lightbox, so closing it
          // leaves the customer on the image they were actually looking at.
          view: ({ index: next }) => {
            setIndex(next);
            const item = media[next];
            if (item) onActiveChange?.(item.id);
          },
        }}
        plugins={[Counter, Thumbnails, Zoom, Video]}
        counter={{ container: { style: { top: "unset", bottom: 0 } } }}
        thumbnails={{ width: 80, height: 80, border: 0, gap: 8, padding: 4 }}
        zoom={{ maxZoomPixelRatio: 3, scrollToZoom: true }}
        carousel={{ finite: true, padding: 0 }}
        /*
         * Set the backdrop through yarl's own variable rather than styling the
         * slide container directly. With the Thumbnails plugin the portal
         * becomes a flex column — the thumbnail strip is a *sibling* of the
         * slide container, not covered by it — so colouring only the container
         * leaves the strip see-through and the page shows through the bottom
         * band. `--yarl__color_backdrop` is the fallback for both surfaces, so
         * one variable paints the whole overlay. Fully opaque, so nothing
         * behind it bleeds through.
         */
        styles={{ root: { "--yarl__color_backdrop": "#0c0a09" } }}
        animation={{ fade: 250, swipe: 300 }}
        controller={{ closeOnBackdropClick: true }}
      />
    </div>
  );
}

/** Catalog media -> lightbox slide. Index parity with `media` is preserved. */
function toSlide(item: CatalogMedia): Slide {
  if (item.type === "video") {
    return {
      type: "video",
      poster: item.previewUrl ?? undefined,
      sources: item.sources.map((source) => ({
        src: source.url,
        type: source.mimeType,
      })),
    };
  }

  // Images, external videos and 3D models all present as a still in the
  // lightbox; the inline gallery remains the place to actually play them.
  const src = item.type === "image" ? item.url : (item.previewUrl ?? "");

  return {
    src,
    alt: item.altText ?? undefined,
    ...(item.type === "image" && item.width && item.height
      ? { width: item.width, height: item.height }
      : {}),
  };
}

function MediaFrame({
  item,
  product,
  priority,
  fit = "contain",
  active = true,
}: {
  item: CatalogMedia;
  product: CatalogProduct;
  priority?: boolean;
  fit?: "contain" | "cover";
  /** Whether this is the slide currently in view — drives video autoplay. */
  active?: boolean;
}) {
  if (item.type === "image") {
    return (
      <Image
        src={item.url}
        alt={imageAlt({ ...item, id: item.id }, product.title)}
        fill
        sizes="(min-width: 1024px) 45vw, 100vw"
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        // Contained so a tall or wide product photo is never cropped — the
        // customer sees the whole product, which is the point of this image.
        className={cn(
          fit === "contain" ? "object-contain p-0 lg:p-3" : "object-cover",
        )}
      />
    );
  }

  if (item.type === "video") {
    return <ProductVideoFrame item={item} product={product} active={active} />;
  }

  if (item.type === "external_video") {
    return (
      <iframe
        src={item.embedUrl}
        title={item.altText ?? `${product.title} video`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        className="size-full"
      />
    );
  }

  // 3D models need a viewer we do not ship; show the poster rather than nothing.
  return item.previewUrl ? (
    <Image
      src={item.previewUrl}
      alt={item.altText ?? product.title}
      fill
      sizes="100vw"
      className="object-contain p-3"
    />
  ) : (
    <div className="grid size-full place-items-center text-sm text-ink-subtle">
      3D model
    </div>
  );
}

/*
 * Autoplays, muted and looping, the moment its slide becomes the active one —
 * the same "preview" behaviour Amazon uses for product videos, so the
 * customer sees it move without having to find and press play themselves.
 * Controls stay on so they can unmute or pause; browsers only block
 * *unmuted* autoplay, so muted+active is enough to satisfy that policy.
 */
function ProductVideoFrame({
  item,
  product,
  active,
}: {
  item: Extract<CatalogMedia, { type: "video" }>;
  product: CatalogProduct;
  active: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (active) {
      video.play().catch(() => {
        // Autoplay can still be rejected (e.g. low-power mode) — the visible
        // native controls remain the fallback for the customer to press play.
      });
    } else {
      video.pause();
    }
  }, [active]);

  return (
    <video
      ref={videoRef}
      controls
      muted
      loop
      playsInline
      preload="metadata"
      poster={item.previewUrl ?? undefined}
      aria-label={item.altText ?? `${product.title} video`}
      className="size-full object-contain"
    >
      {item.sources.map((source) => (
        <source key={source.url} src={source.url} type={source.mimeType} />
      ))}
      Your browser does not support embedded video.
    </video>
  );
}

function ThumbFrame({
  item,
  product,
}: {
  item: CatalogMedia;
  product: CatalogProduct;
}) {
  const url = item.type === "image" ? item.url : item.previewUrl;
  return (
    <>
      {url ? (
        <Image
          src={url}
          alt=""
          aria-hidden="true"
          fill
          sizes="64px"
          className="object-contain p-1"
        />
      ) : (
        <span className="grid size-full place-items-center text-2xs text-ink-subtle">
          {product.title}
        </span>
      )}
      {item.type !== "image" && (
        <span className="absolute inset-0 grid place-items-center bg-ink/25 text-white">
          <PlayIcon size={16} />
        </span>
      )}
    </>
  );
}

function GalleryArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous image" : "Next image"}
      className="pointer-events-auto grid size-9 place-items-center rounded-lg bg-canvas/90 text-ink opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-canvas focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0"
    >
      <Icon size={18} />
    </button>
  );
}

/** Older products may have images but no media connection entries. */
function imagesAsMedia(product: CatalogProduct): CatalogMedia[] {
  return product.images.map((image) => ({
    type: "image" as const,
    id: image.id,
    url: image.url,
    altText: image.altText,
    width: image.width,
    height: image.height,
  }));
}
