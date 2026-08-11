'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { useHydrated } from '@/hooks/use-hydrated';
import { CloseIcon } from './icons';

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
 * `side="bottom"` is the mobile default: a thumb-reachable sheet with a drag
 * handle, rather than a full-screen modal.
 */

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title but keep it for screen readers. */
  hideTitle?: boolean;
  description?: string;
  side?: 'right' | 'left' | 'bottom';
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const SIDE_STYLES = {
  right: 'inset-y-0 right-0 h-full w-full max-w-md rounded-l-xl animate-slide-right',
  left: 'inset-y-0 left-0 h-full w-full max-w-md rounded-r-xl animate-slide-right',
  bottom: 'inset-x-0 bottom-0 max-h-[88vh] w-full rounded-t-xl animate-slide-up',
} as const;

export function Drawer({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  side = 'right',
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
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        panel.querySelector<HTMLElement>('[data-autofocus]') ??
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
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
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
        className="absolute inset-0 animate-fade-in bg-overlay backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'absolute flex flex-col bg-surface shadow-e4 outline-none',
          SIDE_STYLES[side],
          className,
        )}
      >
        {side === 'bottom' && (
          <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-line-strong" />
          </div>
        )}

        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className={cn('text-lg', hideTitle && 'sr-only')}>
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
                {description}
              </p>
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div className="border-t border-line bg-surface px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
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
