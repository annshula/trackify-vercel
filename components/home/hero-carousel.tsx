"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export type HeroSlide = {
  src: string;
  alt: string;
};

const INTERVAL_MS = 6000;

/**
 * Decorative background carousel for the hero.
 *
 * Purely a crossfading backdrop — the headline, copy and CTAs are rendered
 * by the parent server component as plain HTML, so a crawler (or a user
 * with JS disabled) sees the full hero on the first response either way;
 * this component only owns which photo sits behind that text.
 *
 * Autoplay is skipped entirely under prefers-reduced-motion (checked once on
 * mount, not just relying on the CSS override) so a motion-sensitive visitor
 * never gets an unrequested slideshow — the reduced-motion global in
 * globals.css also collapses the crossfade transition itself to ~0ms.
 */
export function HeroCarousel({
  slides,
  mobileSlides = [],
}: {
  slides: HeroSlide[];
  mobileSlides?: HeroSlide[];
}) {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slides.length, paused, reducedMotion]);

  if (slides.length === 0 && mobileSlides.length === 0) return null;

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.src}
          className={cn(
            "absolute inset-0 hidden transition-opacity duration-1000 ease-out-soft md:block",
            index === active ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={index === active ? undefined : true}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            // Hidden below md (md:block) — telling the browser it's ~0px
            // there stops it from fetching a full desktop-width image on a
            // viewport where this slide is never shown.
            sizes="(min-width: 768px) 100vw, 1px"
            priority={index === 0}
            className="object-cover"
          />
        </div>
      ))}

      {/* Mobile-only cover (public/hero/mobile/) — visible strictly below the
          md breakpoint, where the desktop slideshow is hidden. A single cover
          is the common case, but multiples crossfade on the same timer. */}
      {mobileSlides.map((slide, index) => (
        <div
          key={slide.src}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000 ease-out-soft md:hidden",
            mobileSlides.length === 1 || index === active
              ? "opacity-100"
              : "opacity-0",
          )}
          aria-hidden={
            mobileSlides.length === 1 || index === active ? undefined : true
          }
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            // Hidden at md+ (md:hidden) — the mirror image of the desktop
            // slide's sizes above, so this one isn't fetched full-size when
            // the desktop carousel is showing instead.
            sizes="(min-width: 768px) 1px, 100vw"
            priority={index === 0}
            className="object-cover"
          />
        </div>
      ))}

      {/* Two layers, not one, because real photography (unlike the old flat
          gradient placeholders) can be bright anywhere in the frame:
          - A uniform base tint guarantees a contrast floor no matter what the
            photo looks like, so a bright/busy image never breaks readability.
          - The directional gradient on top adds extra darkening exactly where
            it's needed: the top strip (transparent header text/icons sit
            there) and the bottom strip (the headline/CTAs sit there), while
            staying lighter through the middle so the photo still reads. */}
      <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-linear-to-b from-black/40 via-black/10 to-black/80"
        aria-hidden="true"
      />

      {/* Anchored to the right edge, not centered — the hero's own
          scroll-down chevron (see hero.tsx) occupies the centered spot at
          the same height, and the two were overlapping there. Bottom offset
          clears the fixed mobile tab bar (hidden only from lg up) the same
          way the hero's own CTA block does. */}
      {slides.length > 1 && (
        <div className="absolute right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] hidden items-center gap-2 sm:right-10 md:flex lg:right-14 lg:bottom-9">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show slide ${index + 1} of ${slides.length}`}
              aria-current={index === active}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-300",
                index === active
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/75",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function useReducedMotion(): boolean {
  // Lazy initializer, not an effect: the value is available on the very
  // first client render instead of flipping true->false a tick later, and it
  // never calls setState from inside an effect body.
  const [reduced, setReduced] = React.useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
