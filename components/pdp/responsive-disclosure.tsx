"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Collapsible on mobile, always open from `lg` up.
 *
 * Pure CSS decides the breakpoint (no matchMedia), so server HTML and the
 * first client render agree. Below lg a real button with aria-expanded drives
 * it; from lg the button is hidden and a plain heading takes its place.
 */
export function ResponsiveDisclosure({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const panelId = `${id}-panel`;
  return (
    <div className={cn("border-b border-line lg:border-0", className)}>
      <h3 className="lg:mb-5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 text-left font-display text-lg lg:hidden"
        >
          {title}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
            className={cn("shrink-0 transition-transform duration-200", open && "rotate-45")}
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <span className="hidden font-display text-xl lg:block">{title}</span>
      </h3>
      <div id={panelId} className={cn("pb-6 lg:block lg:pb-0", open ? "block" : "hidden")}>
        {children}
      </div>
    </div>
  );
}
