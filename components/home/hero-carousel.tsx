"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export type HeroSlide = {
  src: string;
  alt: string;
};

export type HeroVideo = {
  src: string;
  /** Still frame shown before the video can play, and for reduced-motion visitors instead of the video. */
  poster?: string;
};

const INTERVAL_MS = 6000;

/**
 * Decorative background carousel for the hero.
 *
 * Purely a crossfading backdrop — the headline, copy and CTAs are rendered
 * by the parent server component as plain HTML, so a crawler (or a user
 * with JS disabled) sees the full hero on the first response either way;
 * this component only owns which photo (or video) sits behind that text.
 *
 * Autoplay is skipped entirely under prefers-reduced-motion (checked once on
 * mount, not just relying on the CSS override) so a motion-sensitive visitor
 * never gets an unrequested slideshow or video — the reduced-motion global
 * in globals.css also collapses the crossfade transition itself to ~0ms.
 */
export function HeroCarousel({
  slides,
  mobileSlides = [],
  video = null,
  mobileVideo = null,
}: {
  slides: HeroSlide[];
  mobileSlides?: HeroSlide[];
  /** Desktop/tablet only — replaces the image slides with a looping video when present. */
  video?: HeroVideo | null;
  /** Mobile only — replaces the mobile image cover with a looping video when present. */
  mobileVideo?: HeroVideo | null;
}) {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reducedMotion = useReducedMotion();
  // A reduced-motion visitor gets the poster as a plain image, never the
  // <video> element itself — autoplay is never appropriate for them, and an
  // unplayed video is just a worse image.
  const showVideo = video !== null && !reducedMotion;
  const showMobileVideo = mobileVideo !== null && !reducedMotion;

  React.useEffect(() => {
    if (
      (showVideo && showMobileVideo) ||
      slides.length < 2 ||
      paused ||
      reducedMotion
    )
      return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [showVideo, showMobileVideo, slides.length, paused, reducedMotion]);

  if (
    slides.length === 0 &&
    mobileSlides.length === 0 &&
    !video &&
    !mobileVideo
  )
    return null;

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {showVideo ? (
        <video
          key={video.src}
          autoPlay
          muted
          loop
          playsInline
          poster={video.poster}
          // Above-the-fold and meant to autoplay immediately, so it's fetched
          // eagerly like the image slides' priority flag — "none" would
          // otherwise delay the first frame until the browser gets around to
          // it, leaving the poster showing longer than necessary.
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 hidden size-full object-cover md:block"
        >
          <source src={video.src} type="video/mp4" />
        </video>
      ) : null}

      {!showVideo &&
        slides.map((slide, index) => (
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

      {/* Mobile-only backdrop (public/hero/mobile/) — visible strictly below
          the md breakpoint, where the desktop slideshow/video is hidden. A
          video takes precedence over the image cover when both exist, same
          rule as desktop. object-cover naturally crops any letterboxing a
          generated video carries: the real viewport is narrower/taller than
          the video's own frame, so scaling to fill width pushes any top/
          bottom bars out of view without any extra cropping logic. */}
      {showMobileVideo ? (
        <video
          key={mobileVideo.src}
          autoPlay
          muted
          loop
          playsInline
          poster={mobileVideo.poster}
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 block size-full object-cover md:hidden"
        >
          <source src={mobileVideo.src} type="video/mp4" />
        </video>
      ) : (
        mobileSlides.map((slide, index) => (
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
        ))
      )}

      {/* No scrim: the hero photography (and video) is composed with its own
          built-in negative space (empty left/bottom-left for the headline
          and CTAs, product art on the right), so it blends with the text
          directly instead of needing a darkening or lightening layer on
          top. */}

      {/* Anchored to the right edge, not centered — the hero's own
          scroll-down chevron (see hero.tsx) occupies the centered spot at
          the same height, and the two were overlapping there. Bottom offset
          clears the fixed mobile tab bar (hidden only from lg up) the same
          way the hero's own CTA block does. */}
      {!showVideo && slides.length > 1 && (
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
                  ? "w-6 bg-ink"
                  : "w-1.5 bg-ink/40 hover:bg-ink/60",
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
