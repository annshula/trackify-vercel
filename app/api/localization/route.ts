import { NextRequest, NextResponse } from 'next/server';
import { getLocalization } from '@/services/shopify/localization-service';
import { readSelectedCountry } from '@/lib/localization/country';
import { detectVisitorCountry } from '@/lib/localization/geo';

/**
 * GET /api/localization
 *
 * The real list of countries/currencies Shopify has configured for this
 * store (Shopify Markets), the shop's default market for this visitor's
 * actual detected country (from the hosting edge's own geolocation — see
 * lib/localization/geo.ts — resolved through Shopify's own currency data,
 * not computed here), and whichever one this visitor has already chosen.
 * Powers the currency selector — nothing here is a hardcoded list or a
 * computed conversion.
 */

export const runtime = 'nodejs';
// Reads the visitor's own cookie and geolocation headers, so this is
// inherently per-request — a route-level revalidate export would be
// silently ignored once cookies() forces dynamic rendering anyway.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const [localization, selected] = await Promise.all([
      getLocalization(detectVisitorCountry(request)),
      readSelectedCountry(),
    ]);

    return NextResponse.json(
      {
        defaultCountry: localization.defaultCountry,
        countries: localization.availableCountries,
        selected,
      },
      { headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch {
    return NextResponse.json(
      { defaultCountry: null, countries: [], selected: null },
      { status: 200, headers: { 'Cache-Control': 'no-store, private' } },
    );
  }
}
