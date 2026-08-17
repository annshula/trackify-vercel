import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLocalizedVariantPrices } from '@/services/shopify/localization-service';
import { resolveEffectiveCountry } from '@/lib/localization/country';

/**
 * POST /api/localization/prices
 *
 * Given a batch of variant IDs, returns each one's price *as Shopify itself
 * reports it* for the visitor's effective country — their explicit choice if
 * they made one, otherwise the same edge-geolocated country the currency
 * selector already shows as detected (see resolveEffectiveCountry) — no
 * conversion happens in this app. Before either is available, pages keep
 * showing the cached base-currency price and never call this at all.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  variantIds: z
    .array(z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/))
    .min(1)
    .max(60),
});

export async function POST(request: Request): Promise<NextResponse> {
  const country = await resolveEffectiveCountry();
  // No country detected or chosen — nothing to overlay.
  if (!country) {
    return NextResponse.json(
      { prices: {} },
      { headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid variant ids.' }, { status: 400 });
  }

  try {
    const priceMap = await getLocalizedVariantPrices(parsed.data.variantIds, country);
    const prices = Object.fromEntries(priceMap);

    return NextResponse.json(
      { prices, country },
      { headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch {
    // A failed live-price fetch should never break the page — callers fall
    // back to the base-currency price already shown.
    return NextResponse.json(
      { prices: {} },
      { headers: { 'Cache-Control': 'no-store, private' } },
    );
  }
}
