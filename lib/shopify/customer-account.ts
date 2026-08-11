import 'server-only';
import { graphqlRequest, type GraphQLRequest } from './client';
import { UnauthenticatedError } from './errors';
import { customerAccountConfig } from '@/lib/validation/env';
import {
  clearSession,
  isExpired,
  readSession,
  writeSession,
  type CustomerSession,
} from '@/lib/auth/session';

/**
 * ShopifyCustomerAccountService.
 *
 * Every request carries the signed-in customer's own access token, so Shopify
 * itself enforces that a customer can only ever read their own data. No
 * customer record is stored in this application.
 */

export type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
};

function requireConfig() {
  const config = customerAccountConfig();
  if (!config) {
    throw new Error(
      'Customer Account API is not configured. Set SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID and ' +
        'SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID (see .env.example).',
    );
  }
  return config;
}

export function isCustomerAccountConfigured(): boolean {
  return customerAccountConfig() !== null;
}

export function buildAuthorizeUrl(params: {
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const config = requireConfig();
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', params.redirectUri);
  // `openid email` gives us identity; `customer-account-api:full` gives order/address access.
  url.searchParams.set('scope', 'openid email customer-account-api:full');
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const config = requireConfig();
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' };

  // Confidential clients authenticate with HTTP Basic; public clients rely on PKCE alone.
  if (config.clientSecret) {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${credentials}`;
  }

  const response = await fetch(config.tokenUrl, { method: 'POST', headers, body, cache: 'no-store' });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // Deliberately not logged with the request body — it contains the code/refresh token.
    throw new UnauthenticatedError(
      `Shopify rejected the token request (${response.status}). ${detail.slice(0, 200)}`,
    );
  }

  return (await response.json()) as TokenResponse;
}

export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<CustomerSession> {
  const config = requireConfig();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    redirect_uri: params.redirectUri,
    code: params.code,
    code_verifier: params.codeVerifier,
  });

  const token = await postToken(body);
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? null,
    expiresAt: Date.now() + token.expires_in * 1000,
    idToken: token.id_token ?? null,
  };
}

export async function refreshTokens(session: CustomerSession): Promise<CustomerSession> {
  if (!session.refreshToken) throw new UnauthenticatedError();
  const config = requireConfig();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    refresh_token: session.refreshToken,
  });

  const token = await postToken(body);
  return {
    accessToken: token.access_token,
    // Shopify may or may not rotate the refresh token; keep the old one if not.
    refreshToken: token.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + token.expires_in * 1000,
    idToken: token.id_token ?? session.idToken,
  };
}

/** Returns a valid session, refreshing transparently. Null when signed out. */
export async function getValidSession(): Promise<CustomerSession | null> {
  const session = await readSession();
  if (!session) return null;
  if (!isExpired(session)) return session;

  try {
    const refreshed = await refreshTokens(session);
    await writeSession(refreshed);
    return refreshed;
  } catch {
    await clearSession();
    return null;
  }
}

export function buildLogoutUrl(idToken: string | null, postLogoutRedirectUri: string): string {
  const config = requireConfig();
  const url = new URL(config.logoutUrl);
  if (idToken) url.searchParams.set('id_token_hint', idToken);
  url.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
  return url.toString();
}

/**
 * Authenticated GraphQL call. Throws UnauthenticatedError when there is no
 * usable session so callers can redirect to login rather than render an error.
 */
export async function customerRequest<TData, TVariables = Record<string, unknown>>(
  request: GraphQLRequest<TVariables>,
): Promise<TData> {
  const config = requireConfig();
  const session = await getValidSession();
  if (!session) throw new UnauthenticatedError();

  return graphqlRequest<TData, TVariables>(
    config.graphqlUrl,
    { Authorization: session.accessToken },
    'customer',
    // Customer-scoped data must never enter a shared cache.
    { cache: 'no-store', ...request },
  );
}
