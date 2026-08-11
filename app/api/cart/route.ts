import { NextResponse } from 'next/server';
import { fetchCart } from '@/lib/cart/actions';
import { isSignedIn } from '@/lib/auth/guard';

/**
 * GET /api/cart
 *
 * Per-visitor session state — the Shopify cart plus whether a customer is
 * signed in.
 *
 * This exists so the root layout never has to read cookies. A layout that
 * reads cookies makes every route in the app dynamic, which would forfeit
 * static generation for product and collection pages and turn `notFound()`
 * into a soft 404. Fetching this one small payload after hydration keeps the
 * entire storefront statically renderable.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const [cart, signedIn] = await Promise.all([fetchCart(), isSignedIn()]);

  return NextResponse.json(
    { cart, signedIn },
    {
      headers: {
        // Never shared: this response is scoped to one visitor's cookies.
        'Cache-Control': 'no-store, private',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}
