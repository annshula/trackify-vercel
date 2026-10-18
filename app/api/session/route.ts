import { NextResponse } from 'next/server';
import { isSignedIn } from '@/lib/auth/guard';

/**
 * GET /api/session
 *
 * Whether a customer is signed in — per-visitor state, fetched after
 * hydration so the root layout never has to read cookies. A layout that reads
 * cookies makes every route in the app dynamic, which would forfeit static
 * generation for product and collection pages and turn `notFound()` into a
 * soft 404.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const signedIn = await isSignedIn();

  return NextResponse.json(
    { signedIn },
    {
      headers: {
        // Never shared: this response is scoped to one visitor's cookies.
        'Cache-Control': 'no-store, private',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}
