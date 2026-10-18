"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Must match --announce-h in globals.css. */
const BAR_HEIGHT_PX = 36;

/**
 * The store-wide message bar above the header (`custom.announcements` on the
 * shop, edited in Shopify admin). Desktop shows every message in one row;
 * phones show one at a time, rotating every few seconds, since three lines
 * would crowd a narrow screen. Rotation pauses while hovered or focused so a
 * message can be read in full.
 *
 * It scrolls away with the page while the header is fixed, so the header's
 * `top` follows it: --announce-offset shrinks from the bar's height to 0 as the
 * page scrolls (see the header and the :root defaults in globals.css). The
 * home page hides the bar — its hero carries the message — via
 * `body:has([data-home-hero])`.
 */
export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const hasMessages = messages.length > 0;

  React.useEffect(() => {
    if (messages.length < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), 4000);
    return () => window.clearInterval(timer);
  }, [messages.length, paused]);

  // Keep the fixed header level with the bottom edge of the bar as it scrolls off.
  React.useEffect(() => {
    const root = document.documentElement;
    if (!hasMessages) {
      root.style.setProperty("--announce-offset", "0px");
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      root.style.setProperty("--announce-offset", `${Math.max(0, BAR_HEIGHT_PX - window.scrollY)}px`);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty("--announce-offset");
    };
  }, [hasMessages]);

  if (!hasMessages) return null;

  return (
    <div
      data-announcement
      className="h-(--announce-h) bg-sage-900 text-sage-100"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Desktop: all messages in one row, dot-separated. */}
      <ul className="container-page hidden h-full items-center justify-center gap-x-4 text-[0.8125rem] font-medium tracking-wide md:flex">
        {messages.map((message, i) => (
          <React.Fragment key={message}>
            {i > 0 && (
              <li aria-hidden="true" className="text-sage-300">
                •
              </li>
            )}
            <li>{message}</li>
          </React.Fragment>
        ))}
      </ul>

      {/* Phones: one at a time. All are in the DOM for screen readers; only the current one is visible. */}
      <ul className="relative h-full overflow-hidden text-center text-[0.8125rem] font-medium tracking-wide md:hidden">
        {messages.map((message, i) => (
          <li
            key={message}
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-0 flex items-center justify-center px-4 transition-opacity duration-500 motion-reduce:transition-none",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="truncate">{message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
