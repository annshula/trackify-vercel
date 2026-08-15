import { NextResponse, type NextRequest } from "next/server";

/**
 * Request proxy (formerly `middleware.ts`; renamed in Next 16).
 *
 * Three jobs, all cheap enough for every request:
 *  1. Attach a Content-Security-Policy header.
 *  2. Send unauthenticated visitors away from /account/* before a page renders.
 *  3. Normalize legacy Shopify theme URLs onto this storefront's routes.
 *
 * Handle-rename redirects are NOT done here — resolving them needs the catalog,
 * which is a Node-runtime read. The product and collection pages handle that
 * case themselves with a 308.
 *
 * On the CSP: a genuinely per-request nonce needs `headers()` in the render
 * tree to thread it into Server Components, and any use of that dynamic API
 * anywhere under the root layout forces Next.js to render every route on
 * every request — verified empirically here, it turned product, collection,
 * and page routes from statically generated back to fully dynamic. A nonce is
 * also incompatible with statically *cached* HTML on its own terms: the value
 * baked into a page at build/ISR-revalidation time cannot equal a fresh
 * per-request nonce, so the browser would reject Next's own inline hydration
 * scripts (the `__next_f.push(...)` RSC payload chunks) on every cached view,
 * breaking client interactivity — Add to Cart, variant pickers, the cart
 * drawer — while leaving the page looking fine. Partial Prerendering solves
 * this properly by rendering only a nonce'd sliver per request, but adopting
 * it is a bigger, separate architectural change than a header tweak.
 *
 * `'unsafe-inline'` in script-src is therefore a deliberate, documented
 * trade-off, not an oversight — it exists only because Next.js's own RSC
 * hydration payload requires it under static generation. It is the smallest
 * concession that keeps ISR/SSG intact for the product and collection pages,
 * which this app's SEO/performance requirements treat as non-negotiable. The
 * realistic exposure is narrow: this app renders no raw user-submitted HTML
 * anywhere (product content comes from the merchant's own Shopify catalog,
 * not end-user input; the reviews component renders no unmoderated data by
 * default), so the scripts an attacker could get onto the page in the first
 * place are limited to whatever XSS-style injection point they can otherwise
 * find — and every other directive below stays strict specifically to keep
 * that a hard search.
 */

const SESSION_COOKIE = "_tf_session";

/** Public /account routes: the auth flow itself must stay reachable. */
const PUBLIC_ACCOUNT_PATHS = new Set([
  "/account/login",
  "/account/authorize",
  "/account/callback",
  "/account/logout",
  "/account/unavailable",
]);

/** Legacy Shopify theme paths a customer or search engine may still hold. */
const LEGACY_REDIRECTS: {
  from: RegExp;
  to: (match: RegExpMatchArray) => string;
}[] = [
  { from: /^\/products\/([^/]+)\/?$/, to: (m) => `/products/${m[1]}` },
  {
    from: /^\/collections\/([^/]+)\/products\/([^/]+)\/?$/,
    to: (m) => `/products/${m[2]}`,
  },
  { from: /^\/collections\/all\/?$/, to: () => "/collections" },
  { from: /^\/collections\/?$/, to: () => "/collections" },
  // The FAQ moved off the generic static-page system onto its own route
  // (richer layout + FAQPage schema) — must come before the generic
  // /pages/:handle passthrough rule below, which would otherwise match first.
  { from: /^\/pages\/faq\/?$/, to: () => "/faq" },
  { from: /^\/pages\/([^/]+)\/?$/, to: (m) => `/pages/${m[1]}` },
  { from: /^\/search\/?$/, to: () => "/search" },
  { from: /^\/cart\/?$/, to: () => "/cart" },
  { from: /^\/account\/login\/?$/, to: () => "/account/login" },
];

/**
 * React's development build calls eval() to reconstruct component stacks and
 * power Fast Refresh/DevTools — Next.js documents this explicitly. It never
 * does this in a production build, so 'unsafe-eval' is scoped to dev only
 * rather than weakening the policy actual customers get served under.
 */
const IS_DEV = process.env.NODE_ENV !== "production";

const CSP = [
  `default-src 'self'`,
  // See the module doc comment above for why 'unsafe-inline' is here: Next's
  // own RSC hydration payload ships as inline <script> tags whose content is
  // per-request and cannot be nonced without forfeiting static generation, or
  // hashed since it differs on every page.
  `script-src 'self' 'unsafe-inline'${IS_DEV ? ` 'unsafe-eval'` : ""} https://www.googletagmanager.com https://connect.facebook.net https://static.cloudflareinsights.com`,
  // Nonces are not honored on style *attributes* per the CSP spec (only on
  // <style> elements/<link>), and several components set dynamic inline
  // styles (progress bars, color swatches, CSS custom properties). Without a
  // genuine inline <style> block to nonce, 'unsafe-inline' is the only option
  // that does not break those — it is scoped to styles only, which cannot
  // execute script.
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: https://cdn.shopify.com https://*.myshopify.com https://www.facebook.com`,
  // Product/article videos are served from Shopify's video CDN — without this,
  // <video> falls back to default-src 'self' and every request is blocked.
  `media-src 'self' https://cdn.shopify.com https://*.myshopify.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://connect.facebook.net https://www.facebook.com https://cloudflareinsights.com${IS_DEV ? " ws://localhost:* wss://localhost:*" : ""}`,
  // Shopify's ExternalVideo media type is YouTube or Vimeo only.
  `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'self'`,
  `upgrade-insecure-requests`,
].join("; ");

export default function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  const respond = (response: NextResponse): NextResponse => {
    response.headers.set("Content-Security-Policy", CSP);
    return response;
  };

  // ── Legacy URL normalization ────────────────────────────────────────
  for (const rule of LEGACY_REDIRECTS) {
    const match = pathname.match(rule.from);
    if (!match) continue;
    const target = rule.to(match);
    if (target !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return respond(NextResponse.redirect(url, 308));
    }
    break;
  }

  // ── Account guard ───────────────────────────────────────────────────
  if (pathname.startsWith("/account") && !PUBLIC_ACCOUNT_PATHS.has(pathname)) {
    // Presence-only check. The real authorization happens server-side in
    // requireCustomer() — a forged cookie fails there, not here.
    if (!request.cookies.has(SESSION_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = "/account/login";
      url.search = `?returnTo=${encodeURIComponent(pathname + search)}`;
      return respond(NextResponse.redirect(url));
    }
  }

  return respond(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, the webhook endpoint (which must not be
     * redirected), and static files.
     */
    "/((?!_next/static|_next/image|api/webhooks|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
