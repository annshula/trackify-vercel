import 'server-only';
import { storefrontRequest } from '@/lib/shopify/storefront';
import { LOCALIZATION_QUERY, VARIANTS_AVAILABILITY_QUERY } from '@/lib/shopify/queries/storefront';

/**
 * ShopifyLocalizationService.
 *
 * Both functions here return exactly what Shopify's Storefront API reports —
 * no exchange-rate math happens in this app. getAvailableCountries reads the
 * merchant's real Shopify Markets configuration (or just the shop's one
 * default market if Markets isn't set up); getLocalizedVariantPrices asks
 * Shopify for a variant's price already converted to a given country's
 * presentment currency via @inContext, the same mechanism the cart itself
 * uses.
 */

export type LocalizationCountry = {
  isoCode: string;
  name: string;
  currency: { isoCode: string; symbol: string };
};

export type Localization = {
  /** The country/currency Shopify is actually using right now — the shop's real default market when no @inContext override is sent, not a guess. */
  defaultCountry: LocalizationCountry;
  availableCountries: LocalizationCountry[];
};

/**
 * The country/currency list is effectively static store configuration.
 * Caching lives at the route handler that calls this (export const revalidate),
 * not here — this always asks Shopify fresh, the same as every other call in
 * this service layer.
 *
 * `detectedCountry` — Shopify's Storefront API does not geolocate requests
 * itself; it only resolves whatever country @inContext asks for. Passing the
 * visitor's real, edge-detected country here (see lib/localization/geo.ts)
 * makes `defaultCountry` reflect Shopify's actual currency data *for that
 * country*, rather than always the shop's one static default market.
 */
export async function getLocalization(detectedCountry?: string | null): Promise<Localization> {
  const data = await storefrontRequest<{
    localization: { country: LocalizationCountry; availableCountries: LocalizationCountry[] };
  }>({ query: LOCALIZATION_QUERY, variables: { country: detectedCountry ?? null } });
  return {
    defaultCountry: data.localization.country,
    availableCountries: data.localization.availableCountries,
  };
}

export type LocalizedVariantPrice = {
  id: string;
  price: { amount: string; currencyCode: string };
};

/**
 * Live, per-country prices for a batch of variant IDs — used to overlay real
 * Shopify-converted prices onto product cards/PDPs after a shopper picks a
 * country other than the store's default. Always live (no-store): a stale
 * converted price is worse than the extra round trip.
 */
export async function getLocalizedVariantPrices(
  variantIds: string[],
  country: string,
): Promise<Map<string, LocalizedVariantPrice['price']>> {
  if (variantIds.length === 0) return new Map();

  const data = await storefrontRequest<{
    nodes: ({ id: string; price?: { amount: string; currencyCode: string } } | null)[];
  }>({
    query: VARIANTS_AVAILABILITY_QUERY,
    variables: { ids: variantIds, country },
  });

  const prices = new Map<string, LocalizedVariantPrice['price']>();
  for (const node of data.nodes) {
    if (node?.price) prices.set(node.id, node.price);
  }
  return prices;
}
