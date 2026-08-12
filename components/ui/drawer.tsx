"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { useHydrated } from "@/hooks/use-hydrated";
import { CloseIcon } from "./icons";

/**
 * Drawer / bottom sheet.
 *
 * Accessibility contract:
 *  - focus moves in on open and returns to the trigger on close
 *  - Tab is trapped inside while open
 *  - Escape closes
 *  - background scroll is locked without the page shifting
 *  - the panel is a labelled dialog
 *
 * `side="right"` and `"left"` are responsive: a thumb-reachable bottom sheet
 * below `sm`, and a floating panel — inset from every edge, rounded all the
 * way around — from `sm` up. A full-height rectangle with a single rounded
 * corner reads as unfinished on a large screen; insetting it into its own
 * card over the blurred backdrop is what actually reads as considered.
 * `side="bottom"` is always a bottom sheet, at any viewport width.
 *
 * Set `forceSide` (with `side="right"`/`"left"`) when the panel must stay a
 * true side drawer at every width — e.g. a mobile menu that slides in from
 * the edge instead of rising from the bottom as a sheet.
 */

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title but keep it for screen readers. */
  hideTitle?: boolean;
  description?: string;
  /** Custom content rendered in the header row (replaces the title and
      description). The close button is still rendered to its right. */
  header?: React.ReactNode;
  /** Remove the divider line under the header row. */
  hideHeaderBorder?: boolean;
  /** Remove the divider line above the footer. */
  hideFooterBorder?: boolean;
  side?: "right" | "left" | "bottom";
  /** Keep `right`/`left` as a full-height side drawer even below `sm`
      (no bottom-sheet fallback). Ignored for `side="bottom"`. */
  forceSide?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const SHEET_BASE =
  "inset-x-0 bottom-0 max-h-[88vh] w-full rounded-t-2xl animate-slide-up";
const FLOATING_BASE =
  "sm:inset-x-auto sm:bottom-auto sm:inset-y-4 sm:h-[calc(100%-2rem)] sm:max-h-none " +
  "sm:w-full sm:max-w-md sm:rounded-2xl sm:ring-1 sm:ring-ink/5";
// Full-height edge drawer at every viewport (used with forceSide).
const SIDE_DRAWER_BASE = "inset-y-0 h-full max-h-none w-full max-w-md";

const SIDE_STYLES = {
  right: cn(
    SHEET_BASE,
    FLOATING_BASE,
    "sm:right-4 sm:left-auto sm:animate-slide-right",
  ),
  left: cn(
    SHEET_BASE,
    FLOATING_BASE,
    "sm:left-4 sm:right-auto sm:animate-slide-left",
  ),
  bottom: SHEET_BASE,
} as const;

// Same as SIDE_STYLES but with a full-height side drawer below sm instead of
// a bottom sheet; the floating panel from sm up is unchanged.
const SIDE_DRAWER_STYLES = {
  right: cn(
    SIDE_DRAWER_BASE,
    FLOATING_BASE,
    "right-0 sm:left-auto sm:animate-slide-right sm:right-4",
  ),
  left: cn(
    SIDE_DRAWER_BASE,
    FLOATING_BASE,
    "left-0 sm:right-auto sm:animate-slide-left sm:left-4",
  ),
  bottom: SHEET_BASE,
} as const;

export function Drawer({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  header,
  hideHeaderBorder = false,
  hideFooterBorder = false,
  side = "right",
  forceSide = false,
  footer,
  children,
  className,
}: DrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  // createPortal needs document.body, which does not exist during SSR.
  const mounted = useHydrated();
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Lock scroll and compensate for the scrollbar so the page does not jump.
    const { body } = document;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>(focusableSelector) ??
        panel;
      target.focus();
    }, 40);

    return () => {
      window.clearTimeout(focusTimer);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [
        ...panel.querySelectorAll<HTMLElement>(focusableSelector),
      ].filter(
        (element) =>
          element.offsetParent !== null || element === document.activeElement,
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-overlay backdrop-blur-md backdrop-saturate-150"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col overflow-hidden bg-surface shadow-e4 outline-none",
          forceSide ? SIDE_DRAWER_STYLES[side] : SIDE_STYLES[side],
          className,
        )}
      >
        {/* The drag handle only reads correctly while the panel is acting as
            a bottom sheet — hidden once `right`/`left` become a floating
            panel at `sm` and up, and always for a forced side drawer. */}
        <div
          className={cn(
            "flex shrink-0 justify-center pt-3 pb-1",
            side !== "bottom" && (forceSide ? "hidden" : "sm:hidden"),
          )}
          aria-hidden="true"
        >
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>

        <div
          className={cn(
            "flex items-start justify-between gap-4 px-5 py-4",
            !hideHeaderBorder && "border-b border-line",
          )}
        >
          <div className="min-w-0">
            {header ?? (
              <>
                <h2
                  id={titleId}
                  className={cn("text-lg", hideTitle && "sr-only")}
                >
                  {title}
                </h2>
                {description && (
                  <p
                    id={descriptionId}
                    className="mt-0.5 text-sm text-ink-muted"
                  >
                    {description}
                  </p>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {footer && (
          <div
            className={cn(
              "bg-surface px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]",
              !hideFooterBorder && "border-t border-line",
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
