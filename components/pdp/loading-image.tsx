"use client";

import * as React from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./icon";

/**
 * `next/image` (fill) with a spinning loader over its reserved space until the
 * picture has actually painted. The caller supplies the sized, positioned
 * parent; this fills it.
 *
 *  - Images that have already finished loading by the time React hydrates
 *    (cached, or preloaded) never fire `onLoad` again, so `complete` is
 *    checked on mount.
 *  - A `priority` image (the LCP photo) is never hidden while loading: it
 *    arrives with the server HTML and must paint without waiting for
 *    hydration. The spinner still sits behind it until it settles.
 */
export function LoadingImage({
  className,
  spinnerClassName,
  onLoad,
  priority,
  alt,
  ...props
}: Omit<ImageProps, "fill"> & {
  /** Size/colour of the spinner, e.g. "size-5" on a small thumbnail. */
  spinnerClassName?: string;
}) {
  const ref = React.useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    // A cached image can be complete before hydration, so onLoad never fires.
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <>
      <Image
        {...props}
        alt={alt}
        ref={ref}
        fill
        priority={priority}
        className={cn(
          "transition-opacity duration-300",
          !loaded && !priority && "opacity-0",
          className,
        )}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
      />
      {!loaded && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <Icon
            name="spinner"
            className={cn("size-8 animate-spin text-ink-soft motion-reduce:animate-none", spinnerClassName)}
          />
        </span>
      )}
    </>
  );
}
