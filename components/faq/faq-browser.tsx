"use client";

import * as React from "react";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { DragScroll } from "@/components/ui/drag-scroll";
import {
  SearchIcon,
  CloseIcon,
  MapPinIcon,
  ShieldIcon,
  PackageIcon,
  TruckIcon,
  RefreshIcon,
  UserIcon,
  GridIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import type { FaqCategory } from "@/lib/content/faq";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  trackers: MapPinIcon,
  gear: ShieldIcon,
  travel: PackageIcon,
  orders: TruckIcon,
  returns: RefreshIcon,
  account: UserIcon,
};

/**
 * FAQ search + category browser.
 *
 * Categories render as a compact bento grid of self-contained cards (an icon
 * rail replaces the old text sidebar on desktop, chips replace it on mobile)
 * — pure anchor-scroll navigation, every card stays in the DOM at all times.
 * Only the search box actually narrows what's visible, and its default state
 * (empty query) shows everything: the full Q&A set is in the server-rendered
 * HTML from the first response, and filtering only ever happens after a
 * visitor types something, never by default. A crawler that never runs the
 * search still sees every question and answer.
 */
export function FaqBrowser({ categories }: { categories: FaqCategory[] }) {
  const [query, setQuery] = React.useState("");
  const normalized = query.trim().toLowerCase();

  const filtered = normalized
    ? categories
        .map((category) => ({
          ...category,
          items: category.items.filter(
            (item) =>
              item.question.toLowerCase().includes(normalized) ||
              item.answer.toLowerCase().includes(normalized),
          ),
        }))
        .filter((category) => category.items.length > 0)
    : categories;

  const resultCount = filtered.reduce((sum, category) => sum + category.items.length, 0);

  return (
    <div>
      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-lg">
        <SearchIcon
          size={17}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search — &ldquo;Android&rdquo;, &ldquo;RFID&rdquo;, &ldquo;returns&rdquo;…"
          aria-label="Search frequently asked questions"
          className="h-12 w-full rounded-full border border-line-strong bg-surface pr-11 pl-11 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <CloseIcon size={15} />
          </button>
        )}
      </div>

      {normalized && (
        <p className="mt-3 text-center text-sm text-ink-subtle" aria-live="polite">
          {resultCount === 0
            ? `No questions match "${query}".`
            : `${resultCount} question${resultCount === 1 ? "" : "s"} match "${query}".`}
        </p>
      )}

      {/* ── Category chips — mobile/tablet quick jump ───────────────────── */}
      {!normalized && (
        <DragScroll
          as="div"
          className="hide-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1 lg:hidden"
        >
          {categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.id] ?? GridIcon;
            return (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-medium whitespace-nowrap text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                <Icon size={14} />
                {category.title}
              </a>
            );
          })}
        </DragScroll>
      )}

      {/* ── Layout: icon rail (lg+) / bento grid ─────────────────────────── */}
      <div
        className={cn(
          "mt-6",
          !normalized && "grid gap-6 lg:grid-cols-[64px_minmax(0,1fr)] lg:gap-8",
        )}
      >
        {!normalized && (
          <nav
            aria-label="FAQ categories"
            className="hidden lg:sticky lg:top-28 lg:block lg:self-start"
          >
            <ul className="space-y-2">
              {categories.map((category) => {
                const Icon = CATEGORY_ICONS[category.id] ?? GridIcon;
                return (
                  <li key={category.id}>
                    <a
                      href={`#${category.id}`}
                      title={category.title}
                      aria-label={category.title}
                      className="flex size-14 items-center justify-center rounded-xl border border-line bg-surface text-ink-subtle transition-colors hover:border-line-strong hover:bg-surface-sunken hover:text-ink"
                    >
                      <Icon size={18} />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className={cn(normalized ? "space-y-10" : "grid gap-4 lg:grid-cols-2")}>
          {filtered.length === 0 && normalized && (
            <p className="py-12 text-center text-sm text-ink-muted">
              Try a different word, or{" "}
              <a href="#contact" className="text-ink underline underline-offset-4">
                ask us directly
              </a>
              .
            </p>
          )}

          {filtered.map((category, index) => {
            const Icon = CATEGORY_ICONS[category.id] ?? GridIcon;
            const accordionItems: AccordionItem[] = category.items.map((item) => ({
              id: item.id,
              title: item.question,
              content: item.answer,
            }));

            return (
              <section
                key={category.id}
                id={category.id}
                aria-labelledby={`${category.id}-heading`}
                style={{ "--i": index } as React.CSSProperties}
                className={cn(
                  "scroll-mt-28 rounded-2xl border border-line bg-surface p-5 sm:p-6",
                  !normalized && "reveal-item",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                      <Icon size={17} />
                    </span>
                    <div>
                      <h2 id={`${category.id}-heading`} className="text-base leading-tight sm:text-lg">
                        {category.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-subtle">{category.description}</p>
                    </div>
                  </div>
                  {!normalized && (
                    <span
                      className="shrink-0 font-mono text-xs text-ink-subtle/70"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                </div>
                <Accordion items={accordionItems} className="mt-4" />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
