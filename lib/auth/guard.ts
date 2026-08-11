import 'server-only';
import { redirect } from 'next/navigation';
import { getValidSession, isCustomerAccountConfigured } from '@/lib/shopify/customer-account';

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

/** Redirects to login (preserving the destination) when there is no session. */
export async function requireCustomer(returnTo: string): Promise<void> {
  const session = await getValidSession();
  if (session) return;
  redirect(`/account/login?returnTo=${encodeURIComponent(returnTo)}`);
}
