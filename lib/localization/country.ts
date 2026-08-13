import 'server-only';
import { cookies } from 'next/headers';

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
