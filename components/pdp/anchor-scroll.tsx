"use client";

import { useEffect } from "react";

/** How long after arriving the page keeps re-aiming at the target. */
const SETTLE_MS = 1500;

/**
 * In-page jumps (`#reviews`, `#safety`) that land on the target at any
 * viewport.
 *
 * The browser's own smooth jump measures the target once, when it starts. On a
 * phone the sections in between (`content-visibility: auto` bands, lazy
 * images, videos) render while the page glides past them and grow, so the
 * target slides further down and the jump stops short, on the section above.
 * This re-measures the target on every frame instead, then keeps correcting
 * for a moment after arriving. Any touch, wheel or key press hands control
 * back to the visitor.
 */
export function AnchorScroll() {
  useEffect(() => {
    let frame = 0;
    let stop: (() => void) | null = null;

    const jump = (target: HTMLElement) => {
      stop?.();

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const offset = () =>
        parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const targetY = () =>
        Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset());
      const to = (top: number) => window.scrollTo({ top, behavior: "instant" });

      const from = window.scrollY;
      const duration = reduce
        ? 0
        : Math.min(900, Math.max(400, Math.abs(targetY() - from) * 0.25));
      const t0 = performance.now();

      const cancel = () => {
        cancelAnimationFrame(frame);
        for (const type of INTERRUPTS) window.removeEventListener(type, cancel);
        stop = null;
      };
      stop = cancel;
      for (const type of INTERRUPTS) window.addEventListener(type, cancel, { passive: true });

      const step = (now: number) => {
        const elapsed = now - t0;
        const p = duration ? Math.min(1, elapsed / duration) : 1;
        const eased = 1 - (1 - p) ** 3;
        const goal = targetY();
        to(p < 1 ? from + (goal - from) * eased : goal);
        if (elapsed < duration + SETTLE_MS) frame = requestAnimationFrame(step);
        else cancel();
      };
      frame = requestAnimationFrame(step);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const id = link?.getAttribute("href")?.slice(1);
      if (!link || !id) return;
      const target = document.getElementById(decodeURIComponent(id));
      if (!target) return;
      e.preventDefault();
      history.replaceState(null, "", `#${id}`);
      jump(target);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      stop?.();
    };
  }, []);

  return null;
}

const INTERRUPTS = ["wheel", "touchstart", "keydown"] as const;
