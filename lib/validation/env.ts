import "server-only";

/**
 * Server-side environment access.
 *
 * Two guarantees enforced here:
 *  1. A missing required secret throws a loud, actionable error instead of
 *     producing a confusing 401 from Shopify later.
 *  2. No secret may be exposed through a NEXT_PUBLIC_* variable. If one is,
 *     the process refuses to start.
 */

const SECRET_KEYS = [
  "SHOPIFY_ADMIN_API_TOKEN",
  "SHOPIFY_ADMIN_CLIENT_SECRET",
  "SHOPIFY_STOREFRONT_API_TOKEN",
  "SHOPIFY_WEBHOOK_SECRET",
  "SESSION_SECRET",
  "ADMIN_API_KEY",
] as const;

function assertNoLeakedSecrets(): void {
  const leaked: string[] = [];
  for (const key of Object.keys(process.env)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    const suffix = key.slice("NEXT_PUBLIC_".length);
    if (SECRET_KEYS.some((s) => s === suffix || s.endsWith(suffix)))
      leaked.push(key);
    if (/(TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ADMIN_API_KEY)$/.test(suffix))
      leaked.push(key);
  }
  if (leaked.length > 0) {
    throw new Error(
      `Refusing to start: secret-looking values are exposed to the browser via ${[...new Set(leaked)].join(", ")}. ` +
        `Remove the NEXT_PUBLIC_ prefix and read them server-side instead.`,
    );
  }
}

assertNoLeakedSecrets();

function required(name: string, hint: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ${hint} See .env.example.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback = ""): string {
  return (process.env[name] ?? fallback).trim();
}

/** Normalizes "https://shop.myshopify.com/" -> "shop.myshopify.com" */
function normalizeDomain(raw: string): string {
  return raw
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

let cached: ServerEnv | null = null;

export type ServerEnv = ReturnType<typeof buildEnv>;

function buildEnv() {
  const storeDomain = normalizeDomain(
    required(
      "SHOPIFY_STORE_DOMAIN",
      "Set it to your permanent myshopify domain (no protocol).",
    ),
  );
  const apiVersion = optional("SHOPIFY_API_VERSION", "2025-10");

  if (!/^\d{4}-\d{2}$/.test(apiVersion)) {
    throw new Error(
      `SHOPIFY_API_VERSION must look like 2025-10, received "${apiVersion}".`,
    );
  }

  // Admin GraphQL is authenticated one of two ways (see lib/shopify/admin-token.ts):
  //   1. A static custom-app token via SHOPIFY_ADMIN_API_TOKEN (legacy), or
  //   2. The client credentials grant via SHOPIFY_ADMIN_CLIENT_ID + _SECRET,
  //      exchanged programmatically for a 24h access token (2026 Dev Dashboard apps).
  const adminToken = optional("SHOPIFY_ADMIN_API_TOKEN");
  const adminClientId = optional("SHOPIFY_ADMIN_CLIENT_ID");
  const adminClientSecret = optional("SHOPIFY_ADMIN_CLIENT_SECRET");

  return {
    storeDomain,
    apiVersion,

    adminToken,
    adminClientId,
    adminClientSecret,
    adminEndpoint: `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
    adminTokenUrl: `https://${storeDomain}/admin/oauth/access_token`,

    storefrontToken: required(
      "SHOPIFY_STOREFRONT_API_TOKEN",
      "Copy the public access token from the Headless channel storefront.",
    ),
    storefrontEndpoint: `https://${storeDomain}/api/${apiVersion}/graphql.json`,

    customerAccount: {
      shopId: optional("SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID"),
      clientId: optional("SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID"),
    },

    webhookSecret: optional("SHOPIFY_WEBHOOK_SECRET"),
    sessionSecret: optional("SESSION_SECRET"),
    adminApiKey: optional("ADMIN_API_KEY"),
  };
}

export function serverEnv(): ServerEnv {
  cached ??= buildEnv();
  return cached;
}

/**
 * True when at least one Admin GraphQL auth path is configured:
 * a static custom-app token, or both halves of the client credentials pair.
 */
export function isAdminAuthConfigured(): boolean {
  const env = serverEnv();
  return (
    Boolean(env.adminToken) ||
    (Boolean(env.adminClientId) && Boolean(env.adminClientSecret))
  );
}

/** Customer Account API config, or null when the channel is not configured yet. */
export function customerAccountConfig() {
  const env = serverEnv();
  const { shopId, clientId } = env.customerAccount;
  if (!shopId || !clientId) return null;
  const base = `https://shopify.com/authentication/${shopId}`;
  return {
    shopId,
    clientId,
    authorizeUrl: `${base}/oauth/authorize`,
    tokenUrl: `${base}/oauth/token`,
    logoutUrl: `${base}/logout`,
    graphqlUrl: `https://shopify.com/${shopId}/account/customer/api/${env.apiVersion}/graphql`,
  };
}

/** Browser-safe values. Reading these from a client component is fine. */
export const publicEnv = {
  siteUrl: (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/+$/, ""),
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "Trackify",
  ga4Id: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || "",
};
