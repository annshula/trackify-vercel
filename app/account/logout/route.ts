import { NextResponse } from 'next/server';
import { clearSession, readSession } from '@/lib/auth/session';
import { buildLogoutUrl, isCustomerAccountConfigured } from '@/lib/shopify/customer-account';
import { revokeSession } from '@/services/shopify/session-revocation';
import { publicEnv } from '@/lib/validation/env';

/**
 * GET /account/logout
 *
 * Clears the local session first — so a failure on Shopify's side can never
 * leave the customer signed in here — then ends the session at Shopify.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const session = await readSession();
  await clearSession();

  // Server-side revocation: without this, a session cookie captured before
  // logout would keep authenticating until its ~30-day expiry. Best-effort —
  // never blocks sign-out (see services/shopify/session-revocation.ts).
  if (session?.customerId) {
    await revokeSession(session.customerId, session.sessionId);
  }

  if (!isCustomerAccountConfigured() || !session?.idToken) {
    return NextResponse.redirect(new URL('/', publicEnv.siteUrl));
  }

  return NextResponse.redirect(buildLogoutUrl(session.idToken, publicEnv.siteUrl));
}

export async function POST(): Promise<NextResponse> {
  return GET();
}
