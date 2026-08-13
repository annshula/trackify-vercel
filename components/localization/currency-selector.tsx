"use client";

import * as React from "react";
import { ChevronDownIcon, CheckIcon, SearchIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";
import { flagEmoji, currencyDisplayName } from "@/lib/localization/format";
import { useLocalization } from "./localization-provider";
import { useCart } from "@/components/cart/cart-provider";
import { setCountry, clearCountry } from "@/lib/cart/actions";

type CurrencyOption = {
  currencyCode: string;
  currencyName: string;
  symbol: string;
  /** The real Shopify country ISO code this currency is reported against — sent back to setCountry. */
  countryCode: string;
  flag: string;
};

/**
 * A deliberate curation, not a technical limit: Shopify's Markets config for
 * this store reports ~230 presentment countries (its blanket international
 * catch-all), but only these five are meant to be offered as real choices.
 * Everything about each one shown below — its symbol, its full name, its
 * flag — still comes straight from Shopify's own response for that currency,
 * never hand-typed; this list only decides *which* of Shopify's currencies
 * make the cut.
 */
const CURATED_CURRENCIES = ["AUD", "INR", "USD", "GBP", "CAD"];

/**
 * Header currency switcher.
 *
 * The option list is built from real Shopify Markets data (via
 * LocalizationProvider → /api/localization → the real
 * `localization.availableCountries` query), deduplicated by currency code
 * rather than shown one row per country, then narrowed to CURATED_CURRENCIES.
 * The currency's full name, its symbol and its flag are all either read
 * directly from Shopify's response or a deterministic transformation of its
 * ISO code (see lib/localization/format.ts) — never a maintained or invented
 * list of our own.
 */
export function CurrencySelector({ overHero = false }: { overHero?: boolean }) {
  const { country, defaultCountry, countries, ready, setCountryCode } =
    useLocalization();
  const { run } = useCart();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const options = React.useMemo<CurrencyOption[]>(() => {
    const byCurrency = new Map<string, CurrencyOption>();
    // defaultCountry is folded in even though it should already be present
    // in `countries` — a defensive guarantee that the shop's own active
    // currency always has an entry to show, never just a placeholder.
    const source = defaultCountry ? [defaultCountry, ...countries] : countries;
    for (const entry of source) {
      if (!CURATED_CURRENCIES.includes(entry.currency.isoCode)) continue;
      if (byCurrency.has(entry.currency.isoCode)) continue;
      byCurrency.set(entry.currency.isoCode, {
        currencyCode: entry.currency.isoCode,
        currencyName: currencyDisplayName(entry.currency.isoCode),
        symbol: entry.currency.symbol,
        countryCode: entry.isoCode,
        flag: flagEmoji(entry.isoCode),
      });
    }
    return CURATED_CURRENCIES.map((code) => byCurrency.get(code)).filter(
      (option): option is CurrencyOption => option !== undefined,
    );
  }, [countries, defaultCountry]);

  // No manual override yet: show what Shopify itself is actually using right
  // now (the shop's real default market), not a generic placeholder.
  const activeCountry =
    countries.find((entry) => entry.isoCode === country) ?? defaultCountry;
  const activeOption = activeCountry
    ? (options.find(
        (option) => option.currencyCode === activeCountry.currency.isoCode,
      ) ?? null)
    : null;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter(
        (option) =>
          option.currencyName.toLowerCase().includes(normalizedQuery) ||
          option.currencyCode.toLowerCase().includes(normalizedQuery),
      )
    : options;

  // Closes the dropdown and clears the search in one go, so it always
  // reopens fresh — called from every place the dropdown closes, rather than
  // reset via an effect watching `open` (which would be a synchronous
  // setState-in-effect).
  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node))
        close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  const chooseAuto = async () => {
    close();
    setSaving("auto");
    const result = await run(() => clearCountry(), { silent: true });
    setSaving(null);
    if (result.ok) setCountryCode(null);
  };

  const choose = async (option: CurrencyOption) => {
    if (option.countryCode === country) {
      close();
      return;
    }
    close();
    setSaving(option.currencyCode);
    const result = await run(
      () => setCountry({ countryCode: option.countryCode }),
      { silent: true },
    );
    setSaving(null);
    if (result.ok) setCountryCode(option.countryCode);
  };

  // Markets isn't configured beyond the shop's one default currency — a
  // switcher would offer a choice that doesn't actually exist.
  if (ready && options.length <= 1) return null;

  // Still waiting on the initial /api/localization fetch — a plain spinner
  // here, not a "Currency" placeholder that then jumps to a real flag +
  // symbol once the response lands.
  if (!ready) {
    return (
      <div
        className={cn(
          "flex h-11 items-center px-2.5",
          overHero && "opacity-70",
        )}
      >
        <Spinner />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-11 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
          overHero ? "hover:bg-white/15" : "hover:bg-surface-sunken",
        )}
      >
        <span aria-hidden="true">{activeOption?.flag ?? "🌐"}</span>
        <span>{activeOption?.currencyCode ?? "Currency"}</span>
        <ChevronDownIcon
          size={14}
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Currency"
          className="absolute top-full right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-line bg-surface text-ink shadow-e3"
        >
          <div className="relative border-b border-line p-2">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute top-1/2 left-5 -translate-y-1/2 text-ink-subtle"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search currencies"
              aria-label="Search currencies"
              autoFocus
              className="h-10 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            />
          </div>

          {!normalizedQuery && (
            <button
              type="button"
              role="option"
              aria-selected={country === null}
              onClick={chooseAuto}
              disabled={saving !== null}
              className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-line px-4 text-left text-sm transition-colors hover:bg-surface-sunken disabled:opacity-60"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden="true">🌐</span>
                Auto (based on your location)
              </span>
              {saving === "auto" ? (
                <Spinner />
              ) : (
                country === null && (
                  <CheckIcon size={16} className="shrink-0 text-accent" />
                )
              )}
            </button>
          )}

          <ul className="max-h-72 overflow-y-auto py-1.5">
            {filteredOptions.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-ink-subtle">
                No currency matches &ldquo;{query}&rdquo;.
              </li>
            )}
            {filteredOptions.map((option) => {
              const active = option.countryCode === country;
              return (
                <li key={option.currencyCode}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => choose(option)}
                    disabled={saving !== null}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm transition-colors hover:bg-surface-sunken disabled:opacity-60"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden="true" className="shrink-0 w-4 text-center">
                        {option.symbol}
                      </span>
                      <span className="truncate">
                        {option.currencyName} ({option.currencyCode})
                      </span>
                    </span>
                    {saving === option.currencyCode ? (
                      <Spinner />
                    ) : (
                      active && (
                        <CheckIcon size={16} className="shrink-0 text-accent" />
                      )
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="size-4 shrink-0 animate-spin rounded-full border-2 border-ink-subtle border-t-transparent"
      aria-hidden="true"
    />
  );
}
