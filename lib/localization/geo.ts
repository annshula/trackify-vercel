import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * Visitor country, from whichever edge/CDN in front of this app already
 * geolocated the request — never computed or guessed by this app itself.
 *
 * Checks the headers real hosting providers set: `CF-IPCountry` (Cloudflare,
 * which this site runs behind — see the CSP allowance for
 * static.cloudflareinsights.com) and `x-vercel-ip-country` (Vercel), in that
 * order. Neither is set on localhost with no such proxy in front of it,
 * which is why this returns null there — there is nothing to detect.
 *
 * This only ever supplies a *candidate* country to hand to Shopify's
 * `@inContext` — Shopify still resolves the actual currency for it.
 */
export function detectVisitorCountry(request: NextRequest): string | null {
  const candidate =
    request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country');

  if (!candidate) return null;
  const code = candidate.trim().toUpperCase();
  // Both providers use these for "unknown" / non-country traffic (Tor, etc.)
  // rather than omitting the header outright.
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return null;
  return code;
}
