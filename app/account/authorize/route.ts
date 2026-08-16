import { NextResponse } from 'next/server';
import { createCodeChallenge, createCodeVerifier, createNonce, createState } from '@/lib/auth/pkce';
import { writeOAuthTransaction } from '@/lib/auth/session';
import { buildAuthorizeUrl, isCustomerAccountConfigured } from '@/lib/shopify/customer-account';
import { publicEnv } from '@/lib/validation/env';

/**
 * GET /account/authorize
 *
 * Starts the Customer Account API OAuth flow (authorization code + PKCE).
 * The code verifier, state and nonce are stored in a short-lived encrypted
 * cookie — never in a URL, never in localStorage.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Only same-origin paths may be used as a post-login destination. */
function safeReturnTo(raw: string | null): string {
  if (!raw) return '/account';
  // Backslashes are normalized to slashes by URL parsers, so `/\evil.com`
  // would otherwise be treated as the scheme-relative host `//evil.com`.
  if (raw.includes('\\')) return '/account';
  try {
    const resolved = new URL(raw, publicEnv.siteUrl);
    if (resolved.origin !== new URL(publicEnv.siteUrl).origin) return '/account';
    return resolved.pathname + resolved.search;
  } catch {
    return '/account';
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isCustomerAccountConfigured()) {
    const url = new URL('/account/unavailable', publicEnv.siteUrl);
    return NextResponse.redirect(url);
  }

  const requestUrl = new URL(request.url);
  const returnTo = safeReturnTo(requestUrl.searchParams.get('returnTo'));

  const codeVerifier = createCodeVerifier();
  const state = createState();
  const nonce = createNonce();

  await writeOAuthTransaction({ codeVerifier, state, nonce, redirectTo: returnTo });

  const authorizeUrl = buildAuthorizeUrl({
    redirectUri: `${publicEnv.siteUrl}/account/callback`,
    state,
    nonce,
    codeChallenge: createCodeChallenge(codeVerifier),
  });

  return NextResponse.redirect(authorizeUrl);
}
