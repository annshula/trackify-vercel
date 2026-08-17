import 'server-only';
import { redirect } from 'next/navigation';
import { getValidSession, isCustomerAccountConfigured } from '@/lib/shopify/customer-account';
import { clearSession } from '@/lib/auth/session';
import { getRevokedSessionId } from '@/services/shopify/session-revocation';

/**
 * Route guards for customer-only pages.
 *
 * `middleware.ts` already blocks unauthenticated navigation to /account/*;
 * these run again at render time because middleware alone is not an
 * authorization boundary for data access.
 */

export async function isSignedIn(): Promise<boolean> {
  if (!isCustomerAccountConfigured()) return false;
  try {
    return (await getValidSession()) !== null;
  } catch {
    return false;
  }
}

/**
 * Redirects to login (preserving the destination) when there is no session,
 * or when this exact session was revoked at logout — see
 * services/shopify/session-revocation.ts. This is the actual authorization
 * boundary for account data (isSignedIn() above is cosmetic nav state only),
 * so the revocation check belongs here rather than in getValidSession(),
 * which every cart/checkout call also goes through.
 */
export async function requireCustomer(returnTo: string): Promise<void> {
  const session = await getValidSession();
  if (!session) redirect(`/account/login?returnTo=${encodeURIComponent(returnTo)}`);

  if (session.customerId) {
    const revokedId = await getRevokedSessionId(session.customerId);
    if (revokedId === session.sessionId) {
      await clearSession();
      redirect(`/account/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }
}
