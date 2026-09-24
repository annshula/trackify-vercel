"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { ProductFacets } from "@/lib/catalog/repository";
import { buildSearchParams, SORT_OPTIONS } from "@/lib/catalog/query-params";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { CheckIcon, ChevronDownIcon, FilterIcon } from "@/components/ui/icons";
import { colorSwatch, OPTION_IS_COLOR } from "@/lib/catalog/selectors";
import { formatMoney } from "@/lib/utils/money";

/**
 * Filtering and sorting.
 *
 * Only the filters shoppers actually narrow by: availability, price,
 * category, colour and (when a listing has it) size. Brand, tags and other
 * variant options are deliberately not offered.
 *
 * Desktop: one slim sticky bar of pill buttons above a full-width grid —
 * each pill opens a small floating panel, the two yes/no filters toggle in
 * place, sort sits on the right. Mobile: a sticky bar opening a bottom sheet
 * with the same controls. All state lives in the URL.
 */

type Facet = { value: string; label: string; count: number };

/** Variant options worth a filter. Anything else (Material, Style…) is dropped. */
const OPTION_FILTERS = /^(colou?r|size)$/i;

/* ── URL helpers ───────────────────────────────────────────────────── */

function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return React.useCallback(
    (changes: Record<string, string | string[] | null> | "clear") => {
      if (changes === "clear") {
        // Keep the search term and sort; drop every filter.
        const keep = new URLSearchParams();
        for (const key of ["q", "sort"]) {
          const value = searchParams.get(key);
          if (value) keep.set(key, value);
        }
        const query = keep.toString();
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        return;
      }
      const query = buildSearchParams(searchParams, changes).toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
}

/** Selected values for a list param — case-insensitive, like the repository's filtering. */
function useSelected(param: string) {
  const searchParams = useSearchParams();
  return new Set(
    (searchParams.get(param) ?? "")
      .split(",")
      .filter(Boolean)
      .map((v) => v.toLowerCase()),
  );
}

function useToggle() {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  return (param: string, value: string) => {
    const current = (searchParams.get(param) ?? "").split(",").filter(Boolean);
    const key = value.toLowerCase();
    const next = current.some((item) => item.toLowerCase() === key)
      ? current.filter((item) => item.toLowerCase() !== key)
      : [...current, value];
    navigate({ [param]: next.length ? next : null });
  };
}

function useSortOptions() {
  const pathname = usePathname();
  // Search results default to relevance, which the collection sorts don't include.
  return pathname.startsWith("/search")
    ? [{ value: "relevance", label: "Best match" }, ...SORT_OPTIONS]
    : SORT_OPTIONS;
}

function filterModel(facets: ProductFacets) {
  const options = facets.options.filter(
    (option) => OPTION_FILTERS.test(option.name) && option.values.length > 1,
  );
  // Only values that are actually colours: supplier imports put model names
  // ("Magnetic 7", "No.6 non magnetic") in the Colour option, which would
  // otherwise flood the panel with blank dots.
  const rawColour = options.find((option) => OPTION_IS_COLOR.test(option.name));
  const colourValues = rawColour?.values.filter((value) => colorSwatch(value.label) !== null) ?? [];
  return {
    categories: facets.productTypes.length > 1 ? facets.productTypes : [],
    colour: rawColour && colourValues.length > 1 ? { ...rawColour, values: colourValues } : null,
    others: options.filter((option) => !OPTION_IS_COLOR.test(option.name)),
    hasPrice: facets.priceBounds.max > facets.priceBounds.min,
  };
}

/* ── Public: the filter bar (desktop) + sheet trigger (mobile) ─────── */

export function FilterControls({
  facets,
  total,
  activeCount,
}: {
  facets: ProductFacets;
  total: number;
  activeCount: number;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const navigate = useNavigate();
  const searchParams = useSearchParams();
  const model = filterModel(facets);
  const minParam = searchParams.get("min");
  const maxParam = searchParams.get("max");
  const colourParam = model.colour?.name.toLowerCase() ?? "";

  return (
    <>
      {/* Desktop bar */}
      <div className="sticky top-18 z-20 mb-8 hidden border-y border-line/70 bg-canvas/85 py-3 backdrop-blur-xl lg:block">
        <div className="flex items-center gap-2">
          {model.categories.length > 0 && (
            <ListPopover label="Category" param="type">
              <PillList param="type" values={model.categories} />
            </ListPopover>
          )}
          {model.colour && (
            <ListPopover label="Colour" param={colourParam} panelClassName="w-96">
              <SwatchGrid param={colourParam} values={model.colour.values} />
            </ListPopover>
          )}
          {model.others.map((option) => (
            <ListPopover key={option.name} label={option.name} param={option.name.toLowerCase()}>
              <PillList param={option.name.toLowerCase()} values={option.values} />
            </ListPopover>
          ))}
          {model.hasPrice && (
            <FilterPopover
              label={priceLabel(minParam, maxParam, facets.priceBounds.currencyCode) ?? "Price"}
              active={minParam || maxParam ? 1 : 0}
              showCount={false}
            >
              {(close) => <PriceRange bounds={facets.priceBounds} onApplied={close} />}
            </FilterPopover>
          )}

          <span className="mx-1 h-6 w-px bg-line" aria-hidden="true" />

          <TogglePill param="stock" value="in" label="In stock" />
          {facets.onSale > 0 && <TogglePill param="sale" value="1" label="On sale" />}

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => navigate("clear")}
              className="ml-1 cursor-pointer text-sm text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              Reset
            </button>
          )}

          <div className="ml-auto">
            <SortMenu id="desktop-sort" />
          </div>
        </div>
      </div>

      {/* Mobile bar */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 flex gap-2 bg-canvas/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={cn(pill(activeCount > 0), "h-11 flex-1 justify-center")}
        >
          <FilterIcon size={16} />
          Filters
          {activeCount > 0 && <Count value={activeCount} />}
        </button>
        <SortMenu id="mobile-sort" className="h-11 flex-1" />
      </div>

      <Drawer
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        side="bottom"
        title="Filters"
        description={`${total} product${total === 1 ? "" : "s"}`}
        footer={
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate("clear")}
              disabled={activeCount === 0}
            >
              Reset
            </Button>
            <Button fullWidth onClick={() => setSheetOpen(false)}>
              Show {total} result{total === 1 ? "" : "s"}
            </Button>
          </div>
        }
      >
        <div className="space-y-8 px-5 pt-2 pb-4">
          <SheetSection title="Show only">
            <div className="flex flex-wrap gap-2">
              <TogglePill param="stock" value="in" label="In stock" />
              {facets.onSale > 0 && <TogglePill param="sale" value="1" label="On sale" />}
            </div>
          </SheetSection>
          {model.categories.length > 0 && (
            <SheetSection title="Category">
              <PillList param="type" values={model.categories} />
            </SheetSection>
          )}
          {model.colour && (
            <SheetSection title="Colour">
              <SwatchGrid param={colourParam} values={model.colour.values} />
            </SheetSection>
          )}
          {model.others.map((option) => (
            <SheetSection key={option.name} title={option.name}>
              <PillList param={option.name.toLowerCase()} values={option.values} />
            </SheetSection>
          ))}
          {model.hasPrice && (
            <SheetSection title="Price">
              <PriceRange bounds={facets.priceBounds} key={`${minParam}-${maxParam}`} />
            </SheetSection>
          )}
        </div>
      </Drawer>
    </>
  );
}

/** Removable chips for what's currently applied, above the grid. */
export function ActiveFilterChips() {
  const searchParams = useSearchParams();
  const navigate = useNavigate();

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (["sort", "page", "q", "variant"].includes(key)) continue;
    if (key === "stock" || key === "sale") {
      chips.push({
        key,
        label: key === "stock" ? "In stock" : "On sale",
        onRemove: () => navigate({ [key]: null }),
      });
      continue;
    }
    if (key === "min" || key === "max") {
      chips.push({
        key,
        label: `${key === "min" ? "From" : "Up to"} ${value}`,
        onRemove: () => navigate({ [key]: null }),
      });
      continue;
    }
    for (const item of value.split(",").filter(Boolean)) {
      const remaining = value.split(",").filter((entry) => entry !== item);
      chips.push({
        key: `${key}-${item}`,
        label: item,
        onRemove: () => navigate({ [key]: remaining.length ? remaining : null }),
      });
    }
  }

  if (chips.length === 0) return null;

  return (
    <ul className="-mt-2 mb-7 flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove filter: ${chip.label}`}
            className="group/chip inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-ink/[0.05] pr-2 pl-3 text-xs font-medium capitalize transition-colors hover:bg-ink/[0.09]"
          >
            {chip.label}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              className="text-ink-subtle transition-colors group-hover/chip:text-ink"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ── Building blocks ───────────────────────────────────────────────── */

const pill = (active: boolean) =>
  cn(
    "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-200",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    active
      ? "border-ink bg-ink text-ink-inverse"
      : "border-line-strong/80 bg-surface-raised text-ink hover:border-ink/40 hover:shadow-e1",
  );

/** Small count badge; reads well on both the dark (active) and light pill. */
function Count({ value }: { value: number }) {
  return (
    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent tabular-nums">
      {value}
    </span>
  );
}

function FilterPopover({
  label,
  active,
  showCount = true,
  panelClassName,
  children,
}: {
  label: string;
  active: number;
  showCount?: boolean;
  panelClassName?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
}) {
  const [open, setOpen] = React.useState(false);
  const wrapper = React.useRef<HTMLDivElement>(null);
  const panelId = React.useId();
  const triggerId = `${panelId}-trigger`;

  // Looked up by id rather than a ref so the panel's render-prop can receive it.
  const close = React.useCallback(
    (restoreFocus = false) => {
      setOpen(false);
      if (restoreFocus) document.getElementById(triggerId)?.focus();
    },
    [triggerId],
  );

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <div ref={wrapper} className="relative">
      <button
        id={triggerId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(pill(active > 0), open && active === 0 && "border-ink/40 shadow-e1")}
      >
        {label}
        {showCount && active > 0 && <Count value={active} />}
        <ChevronDownIcon
          size={15}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={`${label} filter`}
          className={cn(
            "absolute top-full left-0 z-30 mt-2 max-h-[min(70vh,30rem)] w-80 origin-top-left overflow-y-auto overscroll-contain animate-[pop-in_160ms_var(--ease-out-soft)] rounded-2xl border border-line/80 bg-surface-raised p-5 shadow-e4 motion-reduce:animate-none",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children(() => close(true)) : children}
        </div>
      )}
    </div>
  );
}

/** A popover for a multi-select list param, badged with how many are selected. */
function ListPopover({
  label,
  param,
  panelClassName,
  children,
}: {
  label: string;
  param: string;
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const active = useSelected(param).size;
  return (
    <FilterPopover label={label} active={active} panelClassName={panelClassName}>
      {children}
    </FilterPopover>
  );
}

function TogglePill({ param, value, label }: { param: string; value: string; label: string }) {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const on = searchParams.get(param) === value;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => navigate({ [param]: on ? null : value })}
      className={pill(on)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-4 place-items-center rounded-full border transition-colors",
          on ? "border-ink-inverse bg-ink-inverse text-ink" : "border-line-strong",
        )}
      >
        {on && <CheckIcon size={10} />}
      </span>
      {label}
    </button>
  );
}

function PillList({ param, values }: { param: string; values: Facet[] }) {
  const selected = useSelected(param);
  const toggle = useToggle();
  return (
    <ul className="flex flex-wrap gap-2">
      {values.map((item) => {
        const isSelected = selected.has(item.value.toLowerCase());
        return (
          <li key={item.value}>
            <button
              type="button"
              onClick={() => toggle(param, item.value)}
              aria-pressed={isSelected}
              className={cn(pill(isSelected), "h-9 px-3.5 font-normal")}
            >
              {item.label}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  isSelected ? "text-ink-inverse/60" : "text-ink-subtle",
                )}
              >
                {item.count}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SwatchGrid({ param, values }: { param: string; values: Facet[] }) {
  const selected = useSelected(param);
  const toggle = useToggle();
  return (
    <ul className="grid grid-cols-4 gap-x-2 gap-y-4">
      {values.map((item) => {
        const isSelected = selected.has(item.value.toLowerCase());
        const color = colorSwatch(item.label);
        return (
          <li key={item.value}>
            <button
              type="button"
              onClick={() => toggle(param, item.value)}
              aria-pressed={isSelected}
              aria-label={`${item.label} (${item.count})`}
              className="group/swatch flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg py-1 text-center focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-9 place-items-center rounded-full ring-1 ring-ink/10 ring-inset transition-[box-shadow,transform] duration-200 group-hover/swatch:scale-105",
                  isSelected &&
                    "shadow-[0_0_0_2px_var(--color-surface-raised),0_0_0_3.5px_var(--color-ink)]",
                )}
                // Unknown colour names get a neutral split dot rather than a guessed hex.
                style={{ background: color ?? "conic-gradient(#ece5da 0 50%, #d3c8b8 0 100%)" }}
              >
                {isSelected && (
                  <CheckIcon size={14} className={color && isDark(color) ? "text-white" : "text-ink"} />
                )}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "line-clamp-1 text-xs leading-tight",
                  isSelected ? "font-medium text-ink" : "text-ink-muted",
                )}
              >
                {item.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function isDark(hex: string): boolean {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

function currencySymbol(currencyCode: string) {
  return formatMoney(0, currencyCode).replace(/[\d.,\s]/g, "") || "$";
}

function priceLabel(min: string | null, max: string | null, currencyCode: string): string | null {
  const s = currencySymbol(currencyCode);
  if (min && max) return `${s}${min} – ${s}${max}`;
  if (min) return `From ${s}${min}`;
  if (max) return `Up to ${s}${max}`;
  return null;
}

function PriceRange({
  bounds,
  onApplied,
}: {
  bounds: { min: number; max: number; currencyCode: string };
  onApplied?: () => void;
}) {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const [min, setMin] = React.useState(searchParams.get("min") ?? "");
  const [max, setMax] = React.useState(searchParams.get("max") ?? "");
  const minId = React.useId();
  const maxId = React.useId();
  const symbol = currencySymbol(bounds.currencyCode);

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({ min: min.trim() || null, max: max.trim() || null });
    onApplied?.();
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, placeholder: number) => (
    <div className="flex-1">
      <label htmlFor={id} className="mb-1.5 block text-xs text-ink-subtle">
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-ink-subtle"
        >
          {symbol}
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={(event) => set(event.target.value)}
          placeholder={String(placeholder)}
          className="h-11 w-full min-w-0 [appearance:textfield] rounded-xl border border-line-strong bg-canvas/60 pr-3 pl-7 text-sm tabular-nums transition-colors outline-none focus:border-ink focus:bg-surface-raised [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );

  return (
    <form onSubmit={apply}>
      <div className="flex items-end gap-3">
        {field(minId, "Min", min, setMin, Math.floor(bounds.min))}
        {field(maxId, "Max", max, setMax, Math.ceil(bounds.max))}
      </div>
      <button
        type="submit"
        className="mt-4 h-11 w-full cursor-pointer rounded-full bg-ink text-sm font-medium text-ink-inverse transition-colors hover:bg-primary-hover"
      >
        Apply
      </button>
    </form>
  );
}

function SortMenu({ id, className }: { id: string; className?: string }) {
  const searchParams = useSearchParams();
  const navigate = useNavigate();
  const options = useSortOptions();
  const current = searchParams.get("sort") ?? options[0]!.value;
  const currentLabel =
    options.find((option) => option.value === current)?.label ?? options[0]!.label;

  // A native <select> stretched invisibly over a styled pill: the platform
  // picker (and its accessibility) on every device, with the pill's look.
  return (
    <div className={cn(pill(false), "relative focus-within:border-ink", className)}>
      <span className="text-ink-subtle">Sort:</span>
      <span className="truncate">{currentLabel}</span>
      <ChevronDownIcon size={15} className="ml-auto shrink-0 text-ink-subtle" />
      <label htmlFor={id} className="sr-only">
        Sort products
      </label>
      <select
        id={id}
        value={current}
        onChange={(event) => navigate({ sort: event.target.value })}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3.5 text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
