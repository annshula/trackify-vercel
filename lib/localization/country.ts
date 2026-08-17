import 'server-only';
import { cookies, headers } from 'next/headers';
import { detectVisitorCountry } from './geo';

/**
 * Selected-country cookie.
 *
 * Stores only an ISO country code the shopper picked (e.g. "CA") — never a
 * currency amount or an exchange rate. Every price shown for that choice is
 * still fetched live from Shopify via @inContext; this cookie just says which
 * country to ask Shopify for.
 */

const COUNTRY_COOKIE = '_tf_country';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
} as const;

export async function readSelectedCountry(): Promise<string | null> {
  const store = await cookies();
  return store.get(COUNTRY_COOKIE)?.value ?? null;
}

export async function writeSelectedCountry(isoCode: string): Promise<void> {
  const store = await cookies();
  store.set(COUNTRY_COOKIE, isoCode, cookieOptions);
}

/** "Auto" — clears the manual override so Shopify's own default market applies. */
export async function clearSelectedCountry(): Promise<void> {
  const store = await cookies();
  store.delete(COUNTRY_COOKIE);
}

/**
 * The country that should actually drive pricing and cart currency: the
 * visitor's explicit choice if they made one, otherwise the same
 * edge-geolocated country the currency selector already shows as
 * "detected" (see lib/localization/geo.ts) — so an unconfirmed
 * auto-detection still gets real Shopify-converted prices instead of
 * silently falling back to the shop's base currency until the visitor
 * clicks something.
 *
 * readSelectedCountry() itself stays untouched (still "only an explicit
 * pick, or null") — the currency selector's UI needs to tell "detected but
 * not confirmed" apart from "the visitor picked this," and this function
 * would erase that distinction if it replaced it everywhere.
 */
export async function resolveEffectiveCountry(): Promise<string | null> {
  const selected = await readSelectedCountry();
  if (selected) return selected;
  const headerList = await headers();
  return detectVisitorCountry(headerList);
}
