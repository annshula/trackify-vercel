'use client';

import * as React from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { useHydrated } from '@/hooks/use-hydrated';
import { BLUR_DATA_URL, imageAlt } from '@/lib/utils/image';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlayIcon, ZoomIcon } from '@/components/ui/icons';
import type { CatalogMedia, CatalogProduct } from '@/types/catalog';

/**
 * Product gallery.
 *
 * Mobile is a native scroll-snap carousel — momentum, rubber-banding and
 * accessibility come free, and it costs no JS to drag. Desktop gets a
 * thumbnail rail plus click-to-zoom in a fullscreen dialog.
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
  const media = product.media.length > 0 ? product.media : imagesAsMedia(product);
  const [index, setIndex] = React.useState(0);
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const trackRef = React.useRef<HTMLDivElement>(null);

  /*
   * `index` is the single source of truth for which slide is shown. It changes
   * from three places — a variant selection, a thumbnail/arrow click, and the
   * user swiping — so it is state rather than a derivation.
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
      const target = media.findIndex((item) => item.id === activeMediaId);
      if (target >= 0 && target !== index) setIndex(target);
    }
  }

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;

    // Already there (the user just swiped here) — do not fight their gesture.
    if (Math.round(track.scrollLeft / track.clientWidth) === index) return;

    const child = track.children[index] as HTMLElement | undefined;
    if (child) track.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
  }, [index]);

  const scrollTo = React.useCallback((next: number) => setIndex(next), []);

  // Keep the active dot honest while the user swipes.
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

  if (media.length === 0) {
    return (
      <div className="aspect-[4/5] w-full rounded-lg bg-surface-sunken" role="img" aria-label="No product image available" />
    );
  }

  const current = media[index];

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      {/* Main stage */}
      <div className="relative min-w-0 flex-1">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg bg-surface-sunken lg:overflow-hidden"
          role="group"
          aria-roledescription="carousel"
          aria-label={`${product.title} images`}
        >
          {media.map((item, itemIndex) => (
            <div
              key={item.id}
              className="relative aspect-[4/5] w-full shrink-0 snap-center lg:hidden"
              role="group"
              aria-roledescription="slide"
              aria-label={`${itemIndex + 1} of ${media.length}`}
            >
              <MediaFrame item={item} product={product} priority={itemIndex === 0} />
            </div>
          ))}

          {/* Desktop shows one frame; the rail below drives it. */}
          {current && (
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label={`Zoom ${product.title} image ${index + 1}`}
              className="relative hidden aspect-[4/5] w-full cursor-zoom-in lg:block"
            >
              <MediaFrame item={current} product={product} priority />
              <span className="absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-surface/85 text-ink shadow-e2 backdrop-blur-sm">
                <ZoomIcon size={18} />
              </span>
            </button>
          )}
        </div>

        {media.length > 1 && (
          <>
            <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
              {media.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollTo(itemIndex)}
                  aria-label={`Go to image ${itemIndex + 1}`}
                  aria-current={itemIndex === index}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    itemIndex === index ? 'w-6 bg-ink' : 'w-1.5 bg-line-strong',
                  )}
                />
              ))}
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

      {/* Thumbnail rail */}
      {media.length > 1 && (
        <ul className="hide-scrollbar hidden shrink-0 gap-2 overflow-y-auto lg:flex lg:max-h-[720px] lg:w-20 lg:flex-col">
          {media.map((item, itemIndex) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  scrollTo(itemIndex);
                  onActiveChange?.(item.id);
                }}
                aria-label={`Show image ${itemIndex + 1} of ${media.length}`}
                aria-current={itemIndex === index}
                className={cn(
                  'relative aspect-square w-full overflow-hidden rounded-md bg-surface-sunken ring-1 transition-all duration-200',
                  itemIndex === index ? 'ring-2 ring-ink' : 'ring-line hover:ring-line-strong',
                )}
              >
                <ThumbFrame item={item} product={product} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoomOpen && current && (
        <ZoomDialog item={current} product={product} onClose={() => setZoomOpen(false)} />
      )}
    </div>
  );
}

function MediaFrame({
  item,
  product,
  priority,
}: {
  item: CatalogMedia;
  product: CatalogProduct;
  priority?: boolean;
}) {
  if (item.type === 'image') {
    return (
      <Image
        src={item.url}
        alt={imageAlt({ ...item, id: item.id }, product.title)}
        fill
        sizes="(min-width: 1024px) 45vw, 100vw"
        priority={priority}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        className="object-cover"
      />
    );
  }

  if (item.type === 'video') {
    return (
      <video
        controls
        playsInline
        preload="metadata"
        poster={item.previewUrl ?? undefined}
        aria-label={item.altText ?? `${product.title} video`}
        className="size-full object-cover"
      >
        {item.sources.map((source) => (
          <source key={source.url} src={source.url} type={source.mimeType} />
        ))}
        Your browser does not support embedded video.
      </video>
    );
  }

  if (item.type === 'external_video') {
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
    <Image src={item.previewUrl} alt={item.altText ?? product.title} fill sizes="100vw" className="object-cover" />
  ) : (
    <div className="grid size-full place-items-center text-sm text-ink-subtle">3D model</div>
  );
}

function ThumbFrame({ item, product }: { item: CatalogMedia; product: CatalogProduct }) {
  const url = item.type === 'image' ? item.url : item.previewUrl;
  return (
    <>
      {url ? (
        <Image src={url} alt="" aria-hidden="true" fill sizes="80px" className="object-cover" />
      ) : (
        <span className="grid size-full place-items-center text-2xs text-ink-subtle">{product.title}</span>
      )}
      {item.type !== 'image' && (
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
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'prev' ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous image' : 'Next image'}
      className="pointer-events-auto grid size-10 place-items-center rounded-full bg-surface/85 text-ink opacity-0 shadow-e2 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 hover:bg-surface focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0"
    >
      <Icon size={18} />
    </button>
  );
}

function ZoomDialog({
  item,
  product,
  onClose,
}: {
  item: CatalogMedia;
  product: CatalogProduct;
  onClose: () => void;
}) {
  // createPortal needs document.body, which does not exist during SSR.
  const mounted = useHydrated();

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!mounted) return null;
  const url = item.type === 'image' ? item.url : item.previewUrl;
  if (!url) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${product.title}, enlarged`}
      className="fixed inset-0 z-[60] animate-fade-in bg-canvas"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close enlarged image"
        autoFocus
        className="absolute top-4 right-4 z-10 grid size-11 place-items-center rounded-full bg-surface text-ink shadow-e2"
      >
        <CloseIcon size={20} />
      </button>
      <div className="h-full overflow-auto p-4">
        <div className="relative mx-auto min-h-full w-full max-w-4xl">
          <Image
            src={url}
            alt={imageAlt({ id: item.id, url, altText: item.altText, width: null, height: null }, product.title)}
            width={1600}
            height={2000}
            sizes="100vw"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Older products may have images but no media connection entries. */
function imagesAsMedia(product: CatalogProduct): CatalogMedia[] {
  return product.images.map((image) => ({
    type: 'image' as const,
    id: image.id,
    url: image.url,
    altText: image.altText,
    width: image.width,
    height: image.height,
  }));
}
