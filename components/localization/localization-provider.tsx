'use client';

import * as React from 'react';

/**
 * Country/currency selection + a live-price overlay cache.
 *
 * The provider itself never computes a price — it only ever holds whatever
 * `/api/localization*` last returned, which is Shopify's own response for
 * the visitor's chosen country. Nothing here does currency math.
 *
 * The list of countries and the current selection are fetched client-side
 * after mount (the same reason CartProvider fetches /api/cart instead of
 * reading a cookie in the root layout: doing it there would force every
 * route in the app to render dynamically and forfeit static generation).
 */

export type LocalizationCountry = {
  isoCode: string;
  name: string;
  currency: { isoCode: string; symbol: string };
};

type LocalizedPrice = {
  amount: string;
  currencyCode: string;
  /** Shopify's own localized compare-at price, or null if it doesn't have one in this currency — never derived locally. */
  compareAtAmount: string | null;
};

type LocalizationContextValue = {
  /** null until the visitor picks something themselves — a manual override. */
  country: string | null;
  /**
   * The country/currency Shopify is actually using right now when no
   * override is set — the shop's real default market, fetched from
   * `localization.country`, never assumed from the first list entry.
   */
  defaultCountry: LocalizationCountry | null;
  /**
   * `country` if the visitor picked one, otherwise `defaultCountry`'s code —
   * what actually drives live pricing (see lib/localization/country.ts's
   * resolveEffectiveCountry, which the server side resolves to the same
   * value). Distinct from `country`: the selector still needs to know
   * whether this is a confirmed pick or just a detected default.
   */
  effectiveCountry: string | null;
  /** True once the initial /api/localization fetch has resolved. */
  ready: boolean;
  countries: LocalizationCountry[];
  /** Called after a successful setCountry server action to update local state. */
  setCountryCode: (isoCode: string | null) => void;
  /**
   * Returns a live, Shopify-reported price for this variant if one has
   * already been fetched for the current country — otherwise null, meaning
   * "show the base-currency price you already have."
   */
  localizedPriceFor: (variantId: string) => LocalizedPrice | null;
  /**
   * True from the moment a variant's price is requested until that request
   * resolves (success or failure). Lets a caller show a loading skeleton
   * instead of the base-currency price while a country is selected — the
   * base price briefly showing, then swapping to the converted one, reads as
   * "the price was wrong for a second," which is worse than a brief skeleton.
   */
  isPriceLoading: (variantId: string) => boolean;
  /**
   * Batches a request for live prices covering these variant IDs. Safe to
   * call from many components on the same page — already-cached and
   * in-flight IDs are skipped, and everything asked for within the same tick
   * is coalesced into one network request.
   */
  requestPrices: (variantIds: string[]) => void;
};

const LocalizationContext = React.createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = React.useState<string | null>(null);
  const [defaultCountry, setDefaultCountry] = React.useState<LocalizationCountry | null>(null);
  const [ready, setReady] = React.useState(false);
  const [countries, setCountries] = React.useState<LocalizationCountry[]>([]);
  const [priceMap, setPriceMap] = React.useState<Record<string, LocalizedPrice>>({});
  const [loadingIds, setLoadingIds] = React.useState<Set<string>>(new Set());

  const pendingIds = React.useRef<Set<string>>(new Set());
  const requestedIds = React.useRef<Set<string>>(new Set());
  const flushTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    fetch('/api/localization', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
      .then(
        (data: {
          countries: LocalizationCountry[];
          defaultCountry: LocalizationCountry | null;
          selected: string | null;
        }) => {
          setCountries(data.countries);
          setDefaultCountry(data.defaultCountry);
          setCountry(data.selected);
        },
      )
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') setCountries([]);
      })
      .finally(() => setReady(true));

    return () => controller.abort();
  }, []);

  // The country that should actually drive pricing: the visitor's explicit
  // choice if they made one, otherwise the same edge-geolocated country the
  // selector shows as "detected" — mirrors lib/localization/country.ts's
  // resolveEffectiveCountry(), which is what the server side of every fetch
  // below this actually resolves to. Without this, an unconfirmed
  // auto-detection never requested a live price at all and every price
  // silently stayed in the shop's base currency until the visitor manually
  // picked something (even their own already-detected country again).
  const effectiveCountry = country ?? defaultCountry?.isoCode ?? null;

  // An effective-country change invalidates every price fetched under the old one.
  const countryRef = React.useRef(effectiveCountry);
  React.useEffect(() => {
    if (countryRef.current !== effectiveCountry) {
      countryRef.current = effectiveCountry;
      setPriceMap({});
      setLoadingIds(new Set());
      requestedIds.current.clear();
    }
  }, [effectiveCountry]);

  const flush = React.useCallback(() => {
    flushTimer.current = null;
    const ids = [...pendingIds.current];
    pendingIds.current.clear();
    if (ids.length === 0 || !effectiveCountry) return;

    fetch('/api/localization/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantIds: ids }),
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('failed'))))
      .then((data: { prices: Record<string, LocalizedPrice> }) => {
        if (Object.keys(data.prices).length === 0) return;
        setPriceMap((current) => ({ ...current, ...data.prices }));
      })
      .catch(() => {
        // A missed live-price overlay just means those items keep showing
        // their base-currency price — never worth surfacing as an error.
      })
      .finally(() => {
        // Resolved or not, these variants are no longer "loading" — a
        // failure falls back to the base price rather than a stuck skeleton.
        setLoadingIds((current) => {
          const next = new Set(current);
          for (const id of ids) next.delete(id);
          return next;
        });
      });
  }, [effectiveCountry]);

  const requestPrices = React.useCallback(
    (variantIds: string[]) => {
      if (!effectiveCountry) return;
      const added: string[] = [];
      for (const id of variantIds) {
        if (requestedIds.current.has(id)) continue;
        requestedIds.current.add(id);
        pendingIds.current.add(id);
        added.push(id);
      }
      if (added.length === 0) return;
      setLoadingIds((current) => new Set([...current, ...added]));
      // Coalesce everything requested within the same tick (e.g. every card
      // in a grid mounting at once) into a single request.
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(flush, 60);
    },
    [effectiveCountry, flush],
  );

  const localizedPriceFor = React.useCallback(
    (variantId: string) => priceMap[variantId] ?? null,
    [priceMap],
  );

  const isPriceLoading = React.useCallback(
    (variantId: string) => loadingIds.has(variantId),
    [loadingIds],
  );

  const value = React.useMemo<LocalizationContextValue>(
    () => ({
      country,
      defaultCountry,
      effectiveCountry,
      ready,
      countries,
      setCountryCode: setCountry,
      localizedPriceFor,
      isPriceLoading,
      requestPrices,
    }),
    [
      country,
      defaultCountry,
      effectiveCountry,
      ready,
      countries,
      localizedPriceFor,
      isPriceLoading,
      requestPrices,
    ],
  );

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationContextValue {
  const context = React.useContext(LocalizationContext);
  if (!context) throw new Error('useLocalization must be used inside <LocalizationProvider>');
  return context;
}

/**
 * Convenience hook for a single price display: fires the batched fetch (once
 * per variant — a no-op if something else, e.g. a product page prefetching
 * every variant up front, already requested it) and reports both the live
 * price once it lands and whether one is currently in flight, so a caller
 * can show a skeleton instead of a flash of the wrong currency.
 *
 * Before the initial /api/localization fetch resolves (`ready` is false),
 * this reports `loading: true` rather than assuming "no country selected" —
 * a returning visitor's saved currency choice lives in that same response.
 * Defaulting to "not selected" while it's still in flight is exactly the
 * base-price-then-jump-to-real-price flash this hook exists to avoid.
 */
export function useLocalizedPrice(
  variantId: string | null | undefined,
): { price: LocalizedPrice | null; loading: boolean } {
  const { ready, effectiveCountry, localizedPriceFor, isPriceLoading, requestPrices } = useLocalization();

  React.useEffect(() => {
    if (variantId && effectiveCountry) requestPrices([variantId]);
  }, [variantId, effectiveCountry, requestPrices]);

  if (!variantId) return { price: null, loading: false };
  if (!ready) return { price: null, loading: true };
  return { price: localizedPriceFor(variantId), loading: isPriceLoading(variantId) };
}

/**
 * Same as useLocalizedPrice, but returns a ready-to-render number + currency
 * code, falling back to the catalog's own base-currency amount until (or
 * unless) a live one lands — the one bit of arithmetic this whole feature
 * does is `Number.parseFloat` on the string Shopify returned, never a
 * conversion. Saves every price-displaying component from repeating the same
 * fallback ternary.
 */
export function useLocalizedAmount(
  variantId: string | null | undefined,
  fallbackAmount: number,
  fallbackCurrencyCode: string,
  fallbackCompareAtAmount: number | null = null,
): {
  amount: number;
  currencyCode: string;
  compareAtAmount: number | null;
  loading: boolean;
  isLocalized: boolean;
} {
  const { price, loading } = useLocalizedPrice(variantId);

  if (price) {
    const parsed = Number.parseFloat(price.amount);
    const compareAtParsed =
      price.compareAtAmount !== null ? Number.parseFloat(price.compareAtAmount) : null;
    return {
      amount: Number.isFinite(parsed) ? parsed : fallbackAmount,
      currencyCode: price.currencyCode,
      compareAtAmount: compareAtParsed !== null && Number.isFinite(compareAtParsed) ? compareAtParsed : null,
      loading: false,
      isLocalized: true,
    };
  }
  return {
    amount: fallbackAmount,
    currencyCode: fallbackCurrencyCode,
    compareAtAmount: fallbackCompareAtAmount,
    loading,
    isLocalized: false,
  };
}
