"use client";

import * as React from "react";
import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { DragScroll } from "@/components/ui/drag-scroll";
import { SearchIcon, CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import type { FaqCategory } from "@/lib/content/faq";

/**
 * FAQ search + category browser.
 *
 * The category rail (sidebar on desktop, a horizontal chip strip on mobile)
 * is pure anchor-scroll navigation — every category stays rendered and in
 * the DOM at all times, it just jumps the viewport. Only the search box
 * actually narrows what's visible, and its default state (empty query) shows
 * everything: the full Q&A set is in the server-rendered HTML from the first
 * response, and filtering only ever happens after a visitor types something,
 * never by default. A crawler that never runs the search still sees every
 * question and answer.
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
      <div className="relative mx-auto max-w-xl">
        <SearchIcon
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search questions — e.g. &ldquo;Android&rdquo;, &ldquo;RFID&rdquo;, &ldquo;returns&rdquo;"
          aria-label="Search frequently asked questions"
          className="h-13 w-full rounded-full border border-line-strong bg-surface pr-12 pl-11 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <CloseIcon size={16} />
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

      {/* ── Category rail ─────────────────────────────────────────────── */}
      {!normalized && (
        <>
          {/* Mobile: horizontal chip strip, drag/swipe scrollable. */}
          <DragScroll
            as="div"
            className="hide-scrollbar mt-8 flex gap-2 overflow-x-auto pb-1 lg:hidden"
          >
            {categories.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium whitespace-nowrap text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                {category.title}
              </a>
            ))}
          </DragScroll>
        </>
      )}

      {/* ── Layout: sticky sidebar (lg+) / stacked (mobile) ─────────────── */}
      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
        {!normalized && (
          <nav
            aria-label="FAQ categories"
            className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
          >
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.id}`}
                    className="block rounded-md px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                  >
                    {category.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className={cn("space-y-12", normalized && "lg:col-span-2")}>
          {filtered.length === 0 && normalized && (
            <p className="py-12 text-center text-sm text-ink-muted">
              Try a different word, or{" "}
              <a href="#contact" className="text-ink underline underline-offset-4">
                ask us directly
              </a>
              .
            </p>
          )}

          {filtered.map((category) => {
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
                className="scroll-mt-24"
              >
                <h2 id={`${category.id}-heading`} className="text-xl">
                  {category.title}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{category.description}</p>
                <Accordion items={accordionItems} className="mt-5" />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
