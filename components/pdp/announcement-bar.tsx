"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * The store-wide message bar under the header (`custom.announcements` on the
 * shop, edited in Shopify admin). Desktop shows every message in one row;
 * phones show one at a time, rotating every few seconds, since three lines
 * would crowd a narrow screen. Rotation pauses while hovered or focused so a
 * message can be read in full.
 */
export function AnnouncementBar({ messages }: { messages: string[] }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (messages.length < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % messages.length), 4000);
    return () => window.clearInterval(timer);
  }, [messages.length, paused]);

  if (messages.length === 0) return null;

  return (
    <div
      className="bg-primary text-on-primary"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Desktop: all messages side by side. */}
      <ul className="container-page hidden items-center justify-center gap-x-10 py-2 text-xs font-medium tracking-wide md:flex">
        {messages.map((message) => (
          <li key={message} className="flex items-center gap-2">
            <CheckDot />
            {message}
          </li>
        ))}
      </ul>

      {/* Phones: one at a time. All are in the DOM for screen readers; only the current one is visible. */}
      <ul className="relative h-8 overflow-hidden text-center text-xs font-medium tracking-wide md:hidden">
        {messages.map((message, i) => (
          <li
            key={message}
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2 px-4 transition-opacity duration-500 motion-reduce:transition-none",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <CheckDot />
            <span className="truncate">{message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CheckDot() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 opacity-80" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
