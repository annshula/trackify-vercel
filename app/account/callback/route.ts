import { NextResponse } from 'next/server';
import { consumeOAuthTransaction, writeSession } from '@/lib/auth/session';
import { timingSafeEqualString } from '@/lib/auth/pkce';
import { idTokenNonce } from '@/lib/auth/jwt';
import { exchangeCodeForTokens } from '@/lib/shopify/customer-account';
import { associateCartWithCustomer, restoreCustomerCart } from '@/lib/cart/actions';
import { publicEnv } from '@/lib/validation/env';

/**
 * GET /account/callback
 *
 * Completes the OAuth flow. The state check is what prevents an attacker from
 * completing a login they initiated in the victim's browser, so it runs before
 * the code is exchanged and uses a constant-time comparison.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function errorRedirect(reason: string): NextResponse {
  const url = new URL('/account/login', publicEnv.siteUrl);
  url.searchParams.set('error', reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);

  const providerError = url.searchParams.get('error');
  if (providerError) {
    // Shopify rejected or the customer cancelled — send them back cleanly.
    return errorRedirect(providerError === 'access_denied' ? 'cancelled' : 'provider');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return errorRedirect('missing_code');

  // Single-use: reading the transaction also clears the cookie.
  const transaction = await consumeOAuthTransaction();
  if (!transaction) return errorRedirect('expired');

  if (!timingSafeEqualString(state, transaction.state)) {
    console.warn('[auth] OAuth state mismatch — possible CSRF attempt');
    return errorRedirect('state_mismatch');
  }

  try {
    const session = await exchangeCodeForTokens({
      code,
      codeVerifier: transaction.codeVerifier,
      redirectUri: `${publicEnv.siteUrl}/account/callback`,
    });

    // The nonce we sent at /account/authorize must come back inside the
    // id_token. This is what stops a token obtained through a different,
    // unrelated login attempt from being substituted into this session.
    if (session.idToken) {
      const returnedNonce = idTokenNonce(session.idToken);
      if (!returnedNonce || !timingSafeEqualString(returnedNonce, transaction.nonce)) {
        console.warn('[auth] id_token nonce mismatch — possible token substitution attempt');
        return errorRedirect('nonce_mismatch');
      }
    }

    await writeSession(session);
  } catch (error) {
    // Never log the code or any token.
    console.error('[auth] token exchange failed:', (error as Error).message);
    return errorRedirect('exchange_failed');
  }

  // Reconcile the bag before attaching it: restoreCustomerCart may swap the
  // cart cookie to the one saved against this customer, and the buyer identity
  // has to be set on whichever cart the shopper ends up with.
  await restoreCustomerCart();
  await associateCartWithCustomer();

  const destination = new URL(transaction.redirectTo || '/account', publicEnv.siteUrl);
  return NextResponse.redirect(destination);
}
