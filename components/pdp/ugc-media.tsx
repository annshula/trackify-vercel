"use client";

import * as React from "react";
import { SmartImage as Image } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils/cn";
import type { CatalogPdpContent } from "@/types/catalog";

type UgcItem = CatalogPdpContent["ugcMedia"][number];

/**
 * Customer photos and clips (`custom.ugc_media`, uploaded in Shopify admin →
 * the product → Metafields → "Customer photos & videos") as a swipeable row
 * of portrait 9:16 tiles under the buy buttons. Native scroll-snap does the
 * swiping. Nothing renders until at least one file is added.
 *
 * Clips start muted on tap and only one plays at a time. Photos open full
 * size in a new tab.
 */
export function UgcMedia({ items }: { items: UgcItem[] }) {
  const [playing, setPlaying] = React.useState<string | null>(null);
  const refs = React.useRef(new Map<string, HTMLVideoElement>());

  if (items.length === 0) return null;

  const toggle = (id: string) => {
    for (const [key, element] of refs.current) {
      if (key !== id) element.pause();
    }
    const element = refs.current.get(id);
    if (!element) return;
    if (element.paused) {
      void element.play();
      setPlaying(id);
    } else {
      element.pause();
      setPlaying(null);
    }
  };

  const tile =
    "relative block aspect-9/16 w-full overflow-hidden rounded-xl bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <section aria-labelledby="ugc-heading" className="mt-8">
      <h2 id="ugc-heading" className="text-sm font-medium text-ink">
        Customer photos &amp; videos
      </h2>
      <ul className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 hide-scrollbar sm:mx-0 sm:px-0">
        {items.map((item, index) => (
          <li key={item.id} className="w-32 shrink-0 snap-start sm:w-36">
            {item.type === "video" ? (
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-label={
                  playing === item.id
                    ? `Pause customer video ${index + 1}`
                    : `Play customer video ${index + 1}${item.altText ? `: ${item.altText}` : ""}`
                }
                className={cn(tile, "cursor-pointer")}
              >
                <video
                  ref={(element) => {
                    if (element) refs.current.set(item.id, element);
                    else refs.current.delete(item.id);
                  }}
                  className="size-full object-cover"
                  poster={item.previewUrl ?? undefined}
                  muted
                  loop
                  playsInline
                  preload="none"
                  onPause={() => setPlaying((current) => (current === item.id ? null : current))}
                >
                  {item.sources.map((source) => (
                    <source key={source.url} src={source.url} type={source.mimeType} />
                  ))}
                </video>
                <span
                  className={cn(
                    "absolute inset-0 grid place-items-center bg-ink/15 transition-opacity duration-200",
                    playing === item.id && "opacity-0",
                  )}
                  aria-hidden="true"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-surface-raised/90 text-ink shadow-e2">
                    <svg viewBox="0 0 24 24" className="ml-0.5 size-4" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
              </button>
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open customer photo ${index + 1}${item.altText ? `: ${item.altText}` : ""}`}
                className={tile}
              >
                <Image
                  src={item.url}
                  alt={item.altText ?? ""}
                  fill
                  sizes="9rem"
                  className="object-cover"
                />
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
