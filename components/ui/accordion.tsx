'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { ChevronDownIcon } from './icons';

/**
 * Accordion built on <details>/<summary>.
 *
 * Native disclosure semantics mean keyboard support, screen-reader state and
 * in-page find all work without a single aria attribute.
 */

export type AccordionItem = {
  id: string;
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
  meta?: React.ReactNode;
};

export function Accordion({
  items,
  className,
}: {
  items: AccordionItem[];
  className?: string;
}) {
  return (
    <div className={cn('divide-y divide-line border-y border-line', className)}>
      {items.map((item) => (
        <details key={item.id} open={item.defaultOpen} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-sm font-medium text-ink transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">{item.title}</span>
            <span className="flex shrink-0 items-center gap-3">
              {item.meta}
              <ChevronDownIcon
                size={18}
                className="text-ink-subtle transition-transform duration-200 ease-out-soft group-open:rotate-180"
              />
            </span>
          </summary>
          <div className="animate-fade-in pb-5 text-sm leading-relaxed text-ink-muted">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

/* ── Tabs ──────────────────────────────────────────────────────────────── */

export type TabItem = { id: string; label: string; content: React.ReactNode };

export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  const [active, setActive] = React.useState(items[0]?.id ?? '');
  const listRef = React.useRef<HTMLDivElement>(null);

  // Arrow-key navigation is required for a tablist to be usable by keyboard.
  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = items.findIndex((item) => item.id === active);
    if (index === -1) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = items[nextIndex];
    if (!next) return;
    setActive(next.id);
    listRef.current?.querySelector<HTMLElement>(`#tab-${CSS.escape(next.id)}`)?.focus();
  };

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={onKeyDown}
        className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-line"
      >
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              className={cn(
                'relative shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                selected ? 'text-ink' : 'text-ink-subtle hover:text-ink-muted',
              )}
            >
              {item.label}
              {selected && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          id={`panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${item.id}`}
          hidden={item.id !== active}
          tabIndex={0}
          className="animate-fade-in pt-6 focus-visible:outline-none"
        >
          {item.id === active && item.content}
        </div>
      ))}
    </div>
  );
}
