'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { ProductFacets } from '@/lib/catalog/repository';
import { buildSearchParams, SORT_OPTIONS } from '@/lib/catalog/query-params';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/ui/drawer';
import { CheckIcon, FilterIcon, SortIcon } from '@/components/ui/icons';
import { colorSwatch, OPTION_IS_COLOR } from '@/lib/catalog/selectors';
import { formatMoney } from '@/lib/utils/money';

/**
 * Filtering and sorting.
 *
 * Desktop: a persistent sidebar. Mobile: a bottom sheet, because a full-screen
 * modal on a phone hides the result count the customer is filtering toward.
 * All state lives in the URL.
 */

export function FilterControls({
  facets,
  total,
  activeCount,
}: {
  facets: ProductFacets;
  total: number;
  activeCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get('sort') ?? 'newest';

  const setSort = (value: string) => {
    router.push(`${pathname}?${buildSearchParams(searchParams, { sort: value }).toString()}`, {
      scroll: false,
    });
  };

  return (
    <>
      {/* Mobile control bar */}
      <div className="sticky top-14 z-20 -mx-4 mb-5 flex gap-2 border-b border-line bg-canvas/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-line-strong text-sm font-medium"
        >
          <FilterIcon size={18} />
          Filter
          {activeCount > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-ink text-2xs font-bold text-canvas">
              {activeCount}
            </span>
          )}
        </button>

        <div className="relative flex-1">
          <label htmlFor="mobile-sort" className="sr-only">
            Sort products
          </label>
          <select
            id="mobile-sort"
            value={currentSort}
            onChange={(event) => setSort(event.target.value)}
            className="h-11 w-full appearance-none rounded-md border border-line-strong bg-surface px-3 pr-9 text-sm font-medium"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <SortIcon
            size={16}
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-subtle"
          />
        </div>
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        side="bottom"
        title="Filter"
        description={`${total} product${total === 1 ? '' : 's'}`}
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                router.push(pathname, { scroll: false });
                setOpen(false);
              }}
              disabled={activeCount === 0}
            >
              Clear all
            </Button>
            <Button fullWidth onClick={() => setOpen(false)}>
              Show {total} result{total === 1 ? '' : 's'}
            </Button>
          </div>
        }
      >
        <div className="px-5 py-2">
          <FilterGroups facets={facets} />
        </div>
      </Drawer>
    </>
  );
}

export function FilterSidebar({
  facets,
  activeCount,
}: {
  facets: ProductFacets;
  activeCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside aria-label="Filters" className="hidden w-60 shrink-0 lg:block">
      <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Filter</h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => router.push(pathname, { scroll: false })}
              className="text-xs text-ink-subtle underline underline-offset-4 hover:text-ink"
            >
              Clear all
            </button>
          )}
        </div>
        <FilterGroups facets={facets} />
      </div>
    </aside>
  );
}

function FilterGroups({ facets }: { facets: ProductFacets }) {
  const searchParams = useSearchParams();

  return (
    <div className="divide-y divide-line">
      <ToggleGroup
        title="Availability"
        toggles={[
          { param: 'stock', value: 'in', label: 'In stock only', count: facets.availability.inStock },
          { param: 'sale', value: '1', label: 'On sale', count: facets.onSale },
        ]}
      />

      {facets.priceBounds.max > 0 && (
        <PriceRange bounds={facets.priceBounds} key={searchParams.toString()} />
      )}

      {facets.productTypes.length > 1 && (
        <CheckboxGroup title="Category" param="type" values={facets.productTypes} />
      )}

      {facets.options.map((option) => (
        <CheckboxGroup
          key={option.name}
          title={option.name}
          param={option.name.toLowerCase()}
          values={option.values}
          swatches={OPTION_IS_COLOR.test(option.name)}
        />
      ))}

      {facets.vendors.length > 1 && (
        <CheckboxGroup title="Brand" param="vendor" values={facets.vendors} />
      )}

      {facets.tags.length > 1 && <CheckboxGroup title="Tags" param="tag" values={facets.tags} limit={10} />}
    </div>
  );
}

function useToggleParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return React.useCallback(
    (param: string, value: string, multi = true) => {
      const current = (searchParams.get(param) ?? '').split(',').filter(Boolean);
      const next = multi
        ? current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value]
        : current.includes(value)
          ? []
          : [value];

      const params = buildSearchParams(searchParams, { [param]: next.length > 0 ? next : null });
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
}

function GroupShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium [&::-webkit-details-marker]:hidden">
        {title}
        <span className="text-ink-subtle transition-transform duration-200 group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

function CheckboxGroup({
  title,
  param,
  values,
  swatches = false,
  limit = 8,
}: {
  title: string;
  param: string;
  values: { value: string; label: string; count: number }[];
  swatches?: boolean;
  limit?: number;
}) {
  const searchParams = useSearchParams();
  const toggle = useToggleParam();
  const [expanded, setExpanded] = React.useState(false);

  const selected = new Set((searchParams.get(param) ?? '').split(',').filter(Boolean));
  const visible = expanded ? values : values.slice(0, limit);

  return (
    <GroupShell title={title}>
      <ul className={cn(swatches && 'flex flex-wrap gap-2', !swatches && 'space-y-0.5')}>
        {visible.map((item) => {
          const isSelected = selected.has(item.value);
          const color = swatches ? colorSwatch(item.label) : null;

          if (swatches && color) {
            return (
              <li key={item.value}>
                <button
                  type="button"
                  onClick={() => toggle(param, item.value)}
                  aria-pressed={isSelected}
                  title={`${item.label} (${item.count})`}
                  className={cn(
                    'grid size-9 place-items-center rounded-full ring-1 transition-all',
                    isSelected ? 'ring-2 ring-ink ring-offset-2 ring-offset-canvas' : 'ring-line-strong',
                  )}
                  style={{ backgroundColor: color }}
                >
                  <span className="sr-only">
                    {item.label} ({item.count})
                  </span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.value}>
              <button
                type="button"
                onClick={() => toggle(param, item.value)}
                aria-pressed={isSelected}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-sm px-1 text-left text-sm transition-colors hover:bg-surface-sunken"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-4.5 shrink-0 place-items-center rounded-xs border transition-colors',
                    isSelected ? 'border-ink bg-ink text-canvas' : 'border-line-strong',
                  )}
                >
                  {isSelected && <CheckIcon size={12} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-ink-subtle">{item.count}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {values.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 text-xs text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          {expanded ? 'Show less' : `Show all ${values.length}`}
        </button>
      )}
    </GroupShell>
  );
}

function ToggleGroup({
  title,
  toggles,
}: {
  title: string;
  toggles: { param: string; value: string; label: string; count: number }[];
}) {
  const searchParams = useSearchParams();
  const toggle = useToggleParam();

  return (
    <GroupShell title={title}>
      <ul className="space-y-0.5">
        {toggles.map((item) => {
          const isSelected = searchParams.get(item.param) === item.value;
          return (
            <li key={item.param}>
              <button
                type="button"
                onClick={() => toggle(item.param, item.value, false)}
                aria-pressed={isSelected}
                className="flex min-h-11 w-full items-center gap-2.5 rounded-sm px-1 text-left text-sm transition-colors hover:bg-surface-sunken"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-4.5 shrink-0 place-items-center rounded-xs border transition-colors',
                    isSelected ? 'border-ink bg-ink text-canvas' : 'border-line-strong',
                  )}
                >
                  {isSelected && <CheckIcon size={12} />}
                </span>
                <span className="flex-1">{item.label}</span>
                <span className="text-xs tabular-nums text-ink-subtle">{item.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </GroupShell>
  );
}

function PriceRange({
  bounds,
}: {
  bounds: { min: number; max: number; currencyCode: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [min, setMin] = React.useState(searchParams.get('min') ?? '');
  const [max, setMax] = React.useState(searchParams.get('max') ?? '');

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const params = buildSearchParams(searchParams, {
      min: min.trim() === '' ? null : min.trim(),
      max: max.trim() === '' ? null : max.trim(),
    });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <GroupShell title="Price">
      <form onSubmit={apply} className="space-y-2.5">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="price-min">
            Minimum price
          </label>
          <input
            id="price-min"
            type="number"
            inputMode="decimal"
            min={0}
            max={bounds.max}
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder={String(bounds.min)}
            className="h-10 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-2.5 text-sm tabular-nums"
          />
          <span className="text-ink-subtle" aria-hidden="true">
            –
          </span>
          <label className="sr-only" htmlFor="price-max">
            Maximum price
          </label>
          <input
            id="price-max"
            type="number"
            inputMode="decimal"
            min={0}
            max={bounds.max}
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder={String(bounds.max)}
            className="h-10 w-full min-w-0 rounded-sm border border-line-strong bg-surface px-2.5 text-sm tabular-nums"
          />
        </div>
        <p className="text-xs text-ink-subtle">
          {formatMoney(bounds.min, bounds.currencyCode, { trimZeroCents: true })} –{' '}
          {formatMoney(bounds.max, bounds.currencyCode, { trimZeroCents: true })}
        </p>
        <Button type="submit" variant="secondary" size="sm" fullWidth>
          Apply
        </Button>
      </form>
    </GroupShell>
  );
}

/** Removable chips summarizing what is currently filtered. */
export function ActiveFilterChips() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  for (const [key, value] of searchParams.entries()) {
    if (key === 'sort' || key === 'page' || key === 'q') continue;

    if (key === 'stock' || key === 'sale' || key === 'min' || key === 'max') {
      const label =
        key === 'stock' ? 'In stock' : key === 'sale' ? 'On sale' : key === 'min' ? `From ${value}` : `Up to ${value}`;
      chips.push({
        key: `${key}-${value}`,
        label,
        onRemove: () => {
          const params = buildSearchParams(searchParams, { [key]: null });
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
      });
      continue;
    }

    for (const item of value.split(',').filter(Boolean)) {
      chips.push({
        key: `${key}-${item}`,
        label: item,
        onRemove: () => {
          const remaining = value.split(',').filter((entry) => entry !== item);
          const params = buildSearchParams(searchParams, { [key]: remaining.length ? remaining : null });
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
      });
    }
  }

  if (chips.length === 0) return null;

  return (
    <ul className="mb-5 flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.onRemove}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs font-medium capitalize transition-colors hover:bg-surface-sunken"
          >
            {chip.label}
            <span aria-hidden="true" className="text-ink-subtle">
              ×
            </span>
            <span className="sr-only">Remove filter</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
