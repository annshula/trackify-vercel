import "server-only";
import { serverEnv } from "@/lib/validation/env";

/**
 * Admin API access token resolution.
 *
 * How your app was created decides how it authenticates to the Admin GraphQL
 * API, so both paths are supported here:
 *
 *  1. Custom app in the Shopify admin → SHOPIFY_ADMIN_API_TOKEN (shpat_…) is
 *     a static token you copy once. Used verbatim, forever.
 *
 *  2. App created in the Dev Dashboard → there is no copyable token. You get a
 *     Client ID + Client Secret and exchange them for a 24h access token using
 *     the OAuth 2.0 client credentials grant:
 *
 *        POST https://{shop}.myshopify.com/admin/oauth/access_token
 *        grant_type=client_credentials&client_id=…&client_secret=…
 *        → { access_token, scope, expires_in: 86399 }
 *
 *     The token is cached in-process until just before expiry and refreshed
 *     lazily on the next Admin call by repeating the same exchange. No secret
 *     is ever logged or exposed to the browser.
 */

type ClientCredentialsResponse = {
  access_token: string;
  scope?: string;
  expires_in: number;
};

/** Refresh 10 minutes before the token actually expires, to absorb clock skew. */
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

let cached: { token: string; expiresAt: number } | null = null;

/** Returns the static custom-app token, or null when none is configured. */
export function staticAdminToken(): string | null {
  return serverEnv().adminToken || null;
}

/** Returns the client credentials pair, or null when either half is missing. */
export function adminClientCredentials(): {
  clientId: string;
  clientSecret: string;
} | null {
  const { adminClientId, adminClientSecret } = serverEnv();
  if (!adminClientId || !adminClientSecret) return null;
  return { clientId: adminClientId, clientSecret: adminClientSecret };
}

export type AdminAuthSource =
  | "static-token"
  | "client-credentials"
  | "unconfigured";

export function adminAuthSource(): AdminAuthSource {
  if (staticAdminToken()) return "static-token";
  if (adminClientCredentials()) return "client-credentials";
  return "unconfigured";
}

/**
 * Resolves a usable Admin API access token.
 *
 * Static token wins when present; otherwise the client credentials grant is
 * performed (once per 24h window, cached in-process). Throws a clear,
 * actionable error when neither path is configured.
 */
export async function getAdminAccessToken(): Promise<string> {
  const staticToken = staticAdminToken();
  if (staticToken) return staticToken;

  const credentials = adminClientCredentials();
  if (!credentials) {
    throw new Error(
      "Admin API is not configured. Set SHOPIFY_ADMIN_API_TOKEN (custom-app token) " +
        "OR both SHOPIFY_ADMIN_CLIENT_ID and SHOPIFY_ADMIN_CLIENT_SECRET " +
        "(client credentials grant for Dev Dashboard apps). See .env.example.",
    );
  }

  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const env = serverEnv();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });

  const response = await fetch(env.adminTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    // Deliberately not logged with the request body — it contains the secret.
    throw new Error(
      `Shopify rejected the Admin client credentials exchange (${response.status}). ` +
        `Check SHOPIFY_ADMIN_CLIENT_ID / SHOPIFY_ADMIN_CLIENT_SECRET and that the app is installed ` +
        `on ${env.storeDomain}. ${detail.slice(0, 200)}`,
    );
  }

  const payload = (await response.json()) as ClientCredentialsResponse;
  if (!payload.access_token) {
    throw new Error(
      "Shopify client credentials exchange returned no access_token.",
    );
  }

  const expiresInMs = (payload.expires_in || 86399) * 1000;
  cached = {
    token: payload.access_token,
    expiresAt: Date.now() + expiresInMs - REFRESH_MARGIN_MS,
  };

  return cached.token;
}

/** Test-only hook: drop any cached token so the next call re-exchanges. */
export function resetAdminTokenCacheForTests(): void {
  cached = null;
}
