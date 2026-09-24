"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Drop-in `next/image` replacement that shows the site's shimmer skeleton
 * behind the image until it has actually finished loading.
 *
 * `next/image`'s built-in `placeholder="blur"` only covers the gap between
 * "nothing" and "a blurred preview" — it still leaves a flat color or blurry
 * smear on a slow connection. This wraps that with the same animated
 * shimmer used for skeleton loading states elsewhere (`.skeleton` utility,
 * `components/ui/primitives.tsx`'s `<Skeleton>`), so every image on the site
 * reads as "loading" the same way, not just product photos.
 *
 * Usage is identical to `next/image` — swap the import and every existing
 * prop (`fill`, `width`/`height`, `sizes`, `priority`, `className`, …)
 * keeps working. Pass `showLoader={false}` to skip it entirely (e.g. a
 * static logo that's already inlined in the initial HTML and never visibly
 * "loads").
 */
export function SmartImage({
  showLoader = true,
  wrapperClassName,
  className,
  onLoad,
  style,
  ...props
}: ImageProps & {
  showLoader?: boolean;
  /**
   * Classes for the wrapper span. A `fill` wrapper sits in normal flow, so a
   * second `fill` image stacked in the same box (e.g. a hover swap) needs
   * `absolute inset-0` here — otherwise the two wrappers split the height.
   */
  wrapperClassName?: string;
}) {
  const [loaded, setLoaded] = React.useState(false);
  // Base64 data URLs never need a loading state — they're already inline.
  const isDataUrl = typeof props.src === "string" && props.src.startsWith("data:");
  const skipLoader = !showLoader || isDataUrl;

  // An <img> already served from the browser cache can be `complete` the
  // instant it mounts, before `onLoad` would otherwise fire — checked via
  // ref callback so a repeat view never flashes the shimmer for an image
  // that was never actually pending.
  const checkAlreadyLoaded = React.useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <span
      className={cn(
        "relative block",
        props.fill ? "size-full" : "inline-block",
        wrapperClassName,
      )}
      style={props.fill ? undefined : style}
    >
      {showLoader && !loaded && !skipLoader && (
        <span
          aria-hidden="true"
          className={cn("skeleton absolute inset-0 rounded-[inherit]")}
        />
      )}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is required by ImageProps and spread via {...props} */}
      <Image
        {...props}
        ref={checkAlreadyLoaded}
        style={props.fill ? style : undefined}
        className={cn(
          className,
          showLoader &&
            "transition-opacity duration-300 ease-out-soft",
          showLoader && !loaded && !skipLoader && "opacity-0",
        )}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
      />
    </span>
  );
}
