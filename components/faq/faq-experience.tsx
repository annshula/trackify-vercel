"use client";

import * as React from "react";
import Link from "next/link";
import type { FaqCategory, FaqEntry } from "@/lib/content/faq";
type FaqSubtype = FaqCategory["subtypes"][number];
import { ButtonLink } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/primitives";
import {
  SearchIcon,
  CloseIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  InfoIcon,
  MailIcon,
  MapPinIcon,
  ShieldIcon,
  PackageIcon,
  TruckIcon,
  RefreshIcon,
  UserIcon,
  GridIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  trackers: MapPinIcon,
  gear: ShieldIcon,
  travel: PackageIcon,
  orders: TruckIcon,
  returns: RefreshIcon,
  account: UserIcon,
};

type SearchHit = FaqEntry & {
  categoryId: string;
  categoryTitle: string;
  subtypeId: string;
  subtypeTitle: string;
};

/** Wraps every case-insensitive match of `term` in a highlight span. */
function highlight(text: string, term: string): React.ReactNode {
  if (!term.trim()) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  const regex = new RegExp(`^${escaped}$`, "i");
  return parts.map((part, index) =>
    regex.test(part) ? (
      // No font-weight change here on purpose: a bolder match is wider per
      // character than the surrounding text, so as the match grows/shrinks
      // while typing, everything after it visibly shifts left/right. Color
      // alone highlights without moving anything.
      <mark key={index} className="rounded-sm bg-yellow-200 text-ink">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/**
 * Full FAQ browsing experience: hero search with live suggestions, a
 * category pill row, a sidebar + panel browser, and a contact CTA — one
 * client component, same split as most single-page FAQ builds (a thin
 * server page.tsx hands this its data and everything after that is
 * client-side state: which category is open, what's been searched, which
 * specific answer a suggestion click should land on and expand).
 */
export function FaqExperience({
  categories,
  title,
}: {
  categories: FaqCategory[];
  title: string;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = React.useState(
    categories[0]?.id ?? "",
  );
  const [selectedSubtypeId, setSelectedSubtypeId] = React.useState(
    categories[0]?.subtypes[0]?.id ?? "",
  );
  const [sidebarQuery, setSidebarQuery] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [activeSuggestion, setActiveSuggestion] = React.useState(-1);

  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const detailsRefs = React.useRef(new Map<string, HTMLDetailsElement>());

  const allEntries = React.useMemo<SearchHit[]>(
    () =>
      categories.flatMap((category) =>
        category.subtypes.flatMap((subtype) =>
          subtype.items.map((item) => ({
            ...item,
            categoryId: category.id,
            categoryTitle: category.title,
            subtypeId: subtype.id,
            subtypeTitle: subtype.title,
          })),
        ),
      ),
    [categories],
  );

  // Debounced so the suggestions list doesn't reflow on every keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  React.useEffect(() => {
    setShowSuggestions(debouncedQuery.trim().length > 0);
    setActiveSuggestion(-1);
  }, [debouncedQuery]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = React.useMemo<SearchHit[]>(() => {
    const term = debouncedQuery.trim().toLowerCase();
    if (!term) return [];
    return allEntries
      .filter(
        (entry) =>
          entry.question.toLowerCase().includes(term) ||
          entry.answer.toLowerCase().includes(term),
      )
      .slice(0, 5);
  }, [allEntries, debouncedQuery]);

  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) ??
    categories[0];

  const selectedSubtype: FaqSubtype | undefined =
    selectedCategory?.subtypes.find((subtype) => subtype.id === selectedSubtypeId) ??
    selectedCategory?.subtypes[0];

  // The panel shows whichever subtype is selected, full stop — mrt's own
  // filteredFAQs depends only on selectedSubTopic, never on search. Search
  // instead powers the suggestions dropdown, which jumps you to the right
  // category/subtype/question wherever it actually lives.
  const visibleItems = selectedSubtype?.items ?? [];

  function scrollToContent() {
    const target = document.getElementById("faq-content");
    if (!target) return;
    const offset = window.innerWidth < 768 ? 40 : 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  function selectCategory(categoryId: string) {
    setSelectedCategoryId(categoryId);
    // Land on that category's first subtype, same as switching main topics resets to its first subtopic.
    const category = categories.find((c) => c.id === categoryId);
    setSelectedSubtypeId(category?.subtypes[0]?.id ?? "");
    setSidebarQuery("");
    for (const details of detailsRefs.current.values()) details.open = false;
    scrollToContent();
  }

  function selectSubtype(subtypeId: string) {
    setSelectedSubtypeId(subtypeId);
    for (const details of detailsRefs.current.values()) details.open = false;
  }

  function goToHit(hit: SearchHit) {
    setSelectedCategoryId(hit.categoryId);
    setSelectedSubtypeId(hit.subtypeId);
    setQuery("");
    setShowSuggestions(false);
    setActiveSuggestion(-1);

    // The target answer isn't in the DOM until its category becomes selected.
    setTimeout(() => {
      scrollToContent();
      setTimeout(() => {
        const details = detailsRefs.current.get(hit.id);
        if (details) {
          details.open = true;
          details.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }, 50);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((index) =>
        Math.min(index + 1, suggestions.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((index) => Math.max(index - 1, -1));
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      goToHit(suggestions[activeSuggestion]!);
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }
  }

  if (!selectedCategory || !selectedSubtype) return null;

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────
          Full viewport height, like the homepage hero. -mt-16/-mt-18 cancels
          <main>'s top padding so the tint starts at the true top of the
          viewport, under the transparent header (see header.tsx's
          hasTintedHero) — the header blends into it instead of showing the
          plain page background above it.
          Title, subheading and search are one vertically centered block;
          the category pills sit right below that block rather than being
          folded into the centering math, and the Q&A itself only starts
          once you scroll past this whole section. */}
      <section className="relative -mt-16 flex min-h-hero flex-col overflow-hidden bg-accent-soft/40 pt-20 pb-12 sm:-mt-18 sm:pt-24">
        {/* Breadcrumb sits inside the tinted section (not before it) so the
            tint itself starts at the true top of the viewport, behind the
            fixed transparent header — a separate block above the hero would
            leave an untinted gap the header shows through instead. */}
        <div className="container-page">
          <Breadcrumb items={[{ href: "/", label: "Home" }, { label: title }]} />
        </div>

        {/* Centered block: badge through the category pills, all together —
            one cluster vertically centered in the remaining viewport height,
            not the title/search centered independently of the pills. */}
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="mx-auto w-full max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-1.5 text-xs font-medium tracking-wide text-accent uppercase">
              <InfoIcon size={14} />
              Help center
            </span>
            {/* One word lands in accent color, not the whole line: the gradient
                stops are keyed to the element's box width, so "we" (sitting
                near the horizontal middle of a single-line heading) picks up
                the via-color while the flanking words stay ink. Only holds
                together on one line — wrapping to two splits the gradient
                per line and breaks the effect, hence the wide max-w-3xl. */}
            {/* One size step down from mrt's literal text-3xl/md:text-5xl:
                Trackify's display font (Sora) runs visibly wider/heavier
                than mrt's default sans at the same size class, so matching
                mrt's numbers exactly overshoots the intended visual weight. */}
            <h1 className="mt-3 bg-linear-to-r from-ink via-accent to-ink bg-clip-text text-2xl text-transparent sm:text-3xl md:text-4xl">
              How can we help you?
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
              Find answers to real questions about our trackers, EDC gear, orders
              and returns, or get in touch with our team.
            </p>

            {/* ── Search ───────────────────────────────────────────────── */}
            <div ref={searchContainerRef} className="relative mx-auto mt-6 max-w-2xl">
              <div className="relative">
                <SearchIcon
                  size={17}
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-subtle"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => setShowSuggestions(debouncedQuery.trim().length > 0)}
                  placeholder="Search — &ldquo;Android&rdquo;, &ldquo;RFID&rdquo;, &ldquo;returns&rdquo;…"
                  aria-label="Search frequently asked questions"
                  className="h-13 w-full rounded-full border border-line-strong bg-surface pr-11 pl-11 text-sm shadow-e1 outline-none transition-colors [&::-webkit-search-cancel-button]:appearance-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
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

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-xl border border-line bg-surface text-left shadow-e2">
                  {suggestions.map((hit, index) => (
                    <button
                      key={hit.id}
                      type="button"
                      onClick={() => goToHit(hit)}
                      onMouseEnter={() => setActiveSuggestion(index)}
                      className={cn(
                        "block w-full border-b border-line px-4 py-3 text-left transition-colors last:border-b-0",
                        index === activeSuggestion ? "bg-accent-soft" : "hover:bg-surface-sunken",
                      )}
                    >
                      <p className="text-sm font-medium text-ink">
                        {highlight(hit.question, debouncedQuery)}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-ink-subtle">
                        {highlight(hit.answer, debouncedQuery)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Category pills ─────────────────────────────────────────── */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {categories.map((category) => {
                const Icon = CATEGORY_ICONS[category.id] ?? GridIcon;
                const active = category.id === selectedCategoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => selectCategory(category.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium whitespace-nowrap shadow-e1 transition-all duration-200 hover:-translate-y-0.5",
                      active
                        ? "border-accent bg-accent text-on-accent"
                        : "border-line bg-surface text-ink-muted hover:border-line-strong hover:bg-surface-sunken hover:text-ink",
                    )}
                  >
                    <Icon size={14} />
                    {category.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <a
          href="#faq-content"
          aria-label="Scroll to questions"
          className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:block"
        >
          <div className="flex h-10 w-6 animate-bounce justify-center rounded-full border-2 border-line-strong">
            <div className="mt-2 h-3 w-1 rounded-full bg-ink-subtle" />
          </div>
        </a>
      </section>

      {/* ── Browser: sidebar + panel ─────────────────────────────────────── */}
      <section
        id="faq-content"
        className="container-page scroll-mt-20 py-14 sm:py-16"
      >
        {/* Category context above the sidebar+panel — which main topic (from
            the hero pills) the subtypes and questions below belong to. */}
        <div className="mb-8">
          <h2 className="text-xl">{selectedCategory.title}</h2>
          <p className="mt-1 text-sm text-ink-muted">{selectedCategory.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <nav
            aria-label={`Subtypes in ${selectedCategory.title}`}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <div className="relative mb-4">
              <SearchIcon
                size={15}
                className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-ink-subtle"
              />
              <input
                type="search"
                value={sidebarQuery}
                onChange={(event) => setSidebarQuery(event.target.value)}
                placeholder="Search topics…"
                aria-label="Filter subtypes"
                className="h-9 w-full border-0 border-b border-line-strong bg-transparent pl-6 text-sm outline-none [&::-webkit-search-cancel-button]:appearance-none focus-visible:border-accent"
              />
            </div>

            <p className="mb-3 text-sm font-semibold text-ink">FAQ Topics</p>

            <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
              {selectedCategory.subtypes
                .filter((subtype) =>
                  subtype.title.toLowerCase().includes(sidebarQuery.trim().toLowerCase()),
                )
                .map((subtype) => {
                  const Icon = CATEGORY_ICONS[selectedCategory.id] ?? GridIcon;
                  const active = subtype.id === selectedSubtypeId;
                  return (
                    <li key={subtype.id} className="shrink-0 lg:shrink">
                      <button
                        type="button"
                        onClick={() => selectSubtype(subtype.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors lg:whitespace-normal",
                          active
                            ? "bg-accent-soft text-accent"
                            : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Icon size={16} className={cn("shrink-0", active ? "text-accent" : "text-ink-subtle")} />
                          {subtype.title}
                        </span>
                        <ChevronRightIcon size={13} className="shrink-0 opacity-60" />
                      </button>
                    </li>
                  );
                })}
            </ul>
          </nav>

          <div>
            <div className="mb-6">
              <h3 className="text-lg">{selectedSubtype.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                {selectedSubtype.description}
              </p>
            </div>

            {visibleItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-ink-muted">
                  Nothing here yet.{" "}
                  <a href="#contact" className="text-ink underline underline-offset-4">
                    Ask us directly
                  </a>
                  .
                </p>
              </div>
            ) : (
              // items-start: a CSS grid row sizes to its tallest cell by
              // default, so without this, expanding one question stretches
              // its still-closed row-mate in the other column to match — it
              // looks like that one opened too, even though it didn't.
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                {visibleItems.map((item) => (
                  <details
                    key={item.id}
                    ref={(node) => {
                      if (node) detailsRefs.current.set(item.id, node);
                      else detailsRefs.current.delete(item.id);
                    }}
                    className="group rounded-lg bg-accent-soft"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink transition-colors">
                      {/* Wrapped in one span, not spread as siblings: summary
                          is a flex container with gap-3, so without this
                          wrapper each piece highlight() returns (plain text,
                          <mark>, plain text...) becomes its own flex item and
                          picks up that gap too — visible as extra whitespace
                          around the highlighted word mid-sentence. */}
                      <span>
                        {/* Live query, not debounced: mrt highlights the
                            visible panel instantly as you type (only the
                            suggestions dropdown's own contents wait for the
                            debounce). */}
                        {highlight(item.question, query)}
                      </span>
                      <ChevronDownIcon
                        size={15}
                        className="shrink-0 text-ink-subtle transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <div className="px-4 pt-0 pb-4">
                      <p className="text-sm leading-relaxed text-ink-muted">
                        {highlight(item.answer, query)}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Contact CTA ────────────────────────────────────────────────── */}
      <section
        id="contact"
        aria-labelledby="faq-contact-heading"
        className="relative overflow-hidden bg-linear-to-br from-accent-soft via-surface to-accent-soft py-16"
      >
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-md px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium tracking-wide text-accent uppercase shadow-e1">
            <MailIcon size={14} />
            Still need help?
          </span>
          <h2 id="faq-contact-heading" className="mt-4 text-2xl sm:text-3xl">
            We&rsquo;re here to help
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Our team answers every message within one working day — include your
            order number if it&rsquo;s about an order already placed.
          </p>

          <div className="mt-7 rounded-2xl border-t-4 border-t-accent bg-surface p-6 shadow-e2">
            <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-accent text-on-accent shadow-e1">
              <MailIcon size={22} />
            </div>
            <h3 className="text-lg">Need help?</h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              Send us a message and we&rsquo;ll get back to you directly.
            </p>
            <ButtonLink
              href="/pages/contact"
              size="lg"
              className="mt-5 w-full rounded-full"
            >
              Contact us
            </ButtonLink>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-ink-subtle">
              <Link href="/pages/returns" className="hover:text-ink">
                Returns policy
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/pages/shipping" className="hover:text-ink">
                Shipping details
              </Link>
              <span aria-hidden="true">·</span>
              <Link
                href="/account/orders"
                className="inline-flex items-center gap-0.5 hover:text-ink"
              >
                Track an order
                <ChevronRightIcon size={12} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
