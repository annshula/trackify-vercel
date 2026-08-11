import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';

/**
 * Pagination.
 *
 * Real <a> elements so pages are crawlable and middle-clickable — an
 * infinite-scroll listing is invisible to a search engine and impossible to
 * return to.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === 'page' || value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) params.append(key, item);
    }
    if (target > 1) params.set('page', String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1.5">
      <PageLink
        href={hrefFor(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        rel="prev"
      >
        <ChevronLeftIcon size={18} />
      </PageLink>

      {pages.map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} className="px-1 text-ink-subtle" aria-hidden="true">
            …
          </span>
        ) : (
          <PageLink key={entry} href={hrefFor(entry)} current={entry === page} aria-label={`Page ${entry}`}>
            {entry}
          </PageLink>
        ),
      )}

      <PageLink href={hrefFor(page + 1)} disabled={page >= totalPages} aria-label="Next page" rel="next">
        <ChevronRightIcon size={18} />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  current = false,
  disabled = false,
  children,
  ...props
}: {
  href: string;
  current?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'children'>) {
  const className = cn(
    'grid min-h-11 min-w-11 place-items-center rounded-md px-3 text-sm font-medium transition-colors',
    current ? 'bg-ink text-canvas' : 'text-ink hover:bg-surface-sunken',
    disabled && 'pointer-events-none opacity-35',
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-current={current ? 'page' : undefined} className={className} {...props}>
      {children}
    </Link>
  );
}

/** First, last, and a window around the current page; null renders an ellipsis. */
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current]);
  for (const offset of [-1, 1]) {
    const candidate = current + offset;
    if (candidate > 1 && candidate < total) pages.add(candidate);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];

  for (const [index, value] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) result.push(null);
    result.push(value);
  }

  return result;
}
