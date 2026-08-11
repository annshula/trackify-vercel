'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { CloseIcon, SearchIcon } from '@/components/ui/icons';
import { Skeleton } from '@/components/ui/primitives';
import { formatMoney } from '@/lib/utils/money';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { track } from '@/lib/analytics';

type SearchResults = {
  products: {
    handle: string;
    title: string;
    vendor: string;
    price: number;
    currencyCode: string;
    image: { url: string; altText: string | null } | null;
    available: boolean;
  }[];
  collections: { handle: string; title: string; count: number }[];
  terms: string[];
};

const EMPTY: SearchResults = { products: [], collections: [], terms: [] };

/**
 * Full-screen search overlay.
 *
 * Implements the combobox pattern: the input owns focus while ArrowUp/Down move
 * an `aria-activedescendant` through the results, so keyboard and screen-reader
 * users get the same experience as pointer users.
 */
export function SearchOverlay({
  open,
  onClose,
  popularSearches = [],
}: {
  open: boolean;
  onClose: () => void;
  popularSearches?: string[];
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [term, setTerm] = React.useState('');
  const [results, setResults] = React.useState<SearchResults>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const { value: recent, setValue: setRecent } = useLocalStorage<string[]>('tf_recent_searches', []);
  const listboxId = React.useId();

  // Focus + scroll lock while open. Reset is handled by `key` on the caller,
  // so nothing needs to be cleared here.
  React.useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Debounced fetch; an in-flight request is aborted when the term changes.
  React.useEffect(() => {
    const query = term.trim();
    if (query.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('search failed');
        setResults((await response.json()) as SearchResults);
        setActiveIndex(-1);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setResults(EMPTY);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term]);

  // A query shorter than the minimum has no results by definition — derive it
  // rather than clearing state from an effect.
  const activeResults = term.trim().length >= 2 ? results : EMPTY;
  const isLoading = loading && term.trim().length >= 2;

  const submit = React.useCallback(
    (value: string) => {
      const query = value.trim();
      if (!query) return;
      setRecent((current) => [query, ...current.filter((item) => item !== query)].slice(0, 6));
      track('search', { search_term: query, results_count: activeResults.products.length });
      onClose();
      router.push(`/search?q=${encodeURIComponent(query)}`);
    },
    [onClose, activeResults.products.length, router, setRecent],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    const count = activeResults.products.length;
    if (event.key === 'ArrowDown' && count > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % count);
    } else if (event.key === 'ArrowUp' && count > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const active = activeIndex >= 0 ? activeResults.products[activeIndex] : null;
      if (active) {
        onClose();
        router.push(`/products/${active.handle}`);
      } else {
        submit(term);
      }
    }
  };

  if (!open) return null;

  const hasQuery = term.trim().length >= 2;
  const showEmpty = hasQuery && !isLoading && activeResults.products.length === 0 && activeResults.collections.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas animate-fade-in" role="dialog" aria-modal="true" aria-label="Search products">
      <div className="border-b border-line bg-surface">
        <div className="container-page flex items-center gap-3 py-3">
          <SearchIcon size={20} className="shrink-0 text-ink-subtle" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={activeResults.products.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search for products, brands, collections"
            aria-label="Search"
            className="h-12 w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-subtle"
            // The device keyboard should say "Search", not "Go".
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="grid size-11 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <CloseIcon size={20} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="container-page py-6">
          {!hasQuery && (
            <div className="space-y-8">
              {recent.length > 0 && (
                <TermSection
                  title="Recent"
                  terms={recent}
                  onSelect={submit}
                  onClear={() => setRecent([])}
                />
              )}
              {popularSearches.length > 0 && (
                <TermSection title="Popular right now" terms={popularSearches} onSelect={submit} />
              )}
            </div>
          )}

          {isLoading && (
            <ul className="space-y-3" aria-label="Loading results">
              {[0, 1, 2, 3].map((index) => (
                <li key={index} className="flex items-center gap-4">
                  <Skeleton className="size-16 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && activeResults.terms.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {activeResults.terms.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  className="rounded-full border border-line px-3.5 py-2 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {!isLoading && activeResults.collections.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">
                Collections
              </h2>
              <ul className="flex flex-wrap gap-2">
                {activeResults.collections.map((collection) => (
                  <li key={collection.handle}>
                    <Link
                      href={`/collections/${collection.handle}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-2 rounded-md bg-surface-sunken px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-line"
                    >
                      {collection.title}
                      <span className="text-xs text-ink-subtle">{collection.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!isLoading && activeResults.products.length > 0 && (
            <section>
              <h2 className="mb-3 text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">
                Products
              </h2>
              <ul id={listboxId} role="listbox" aria-label="Product results" className="space-y-1">
                {activeResults.products.map((product, index) => (
                  <li key={product.handle} role="presentation">
                    <Link
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      href={`/products/${product.handle}`}
                      onClick={onClose}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={cn(
                        'flex items-center gap-4 rounded-md p-2 transition-colors',
                        index === activeIndex ? 'bg-surface-sunken' : 'hover:bg-surface-sunken',
                      )}
                    >
                      <span className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-surface-sunken">
                        {product.image && (
                          <Image
                            src={product.image.url}
                            alt={product.image.altText ?? product.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        {product.vendor && (
                          <span className="block text-2xs tracking-[0.1em] text-ink-subtle uppercase">
                            {product.vendor}
                          </span>
                        )}
                        <span className="block truncate text-sm font-medium">{product.title}</span>
                        <span className="mt-0.5 block text-sm tabular-nums text-ink-muted">
                          {formatMoney(product.price, product.currencyCode, { trimZeroCents: true })}
                          {!product.available && <span className="ml-2 text-xs text-ink-subtle">Sold out</span>}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => submit(term)}
                className="mt-5 w-full rounded-md border border-line px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-sunken"
              >
                See all results for “{term.trim()}”
              </button>
            </section>
          )}

          {showEmpty && (
            <div className="py-14 text-center">
              <p className="text-lg">No matches for “{term.trim()}”</p>
              <p className="mt-2 text-sm text-ink-muted">
                Check the spelling, or try a broader word.
              </p>
              {popularSearches.length > 0 && (
                <div className="mt-7">
                  <p className="mb-3 text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">
                    Try instead
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {popularSearches.slice(0, 6).map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setTerm(suggestion)}
                        className="rounded-full border border-line px-3.5 py-2 text-sm transition-colors hover:border-line-strong"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TermSection({
  title,
  terms,
  onSelect,
  onClear,
}: {
  title: string;
  terms: string[];
  onSelect: (term: string) => void;
  onClear?: () => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">{title}</h2>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-ink-subtle underline underline-offset-4 hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>
      <ul className="flex flex-wrap gap-2">
        {terms.map((item) => (
          <li key={item}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="rounded-full border border-line px-3.5 py-2 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              {item}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
