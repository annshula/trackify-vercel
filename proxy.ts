import { NextResponse, type NextRequest } from 'next/server';

/**
 * Request proxy (formerly `middleware.ts`; renamed in Next 16).
 *
 * Two jobs only, both cheap enough for every request:
 *  1. Send unauthenticated visitors away from /account/* before a page renders.
 *  2. Normalize legacy Shopify theme URLs onto this storefront's routes.
 *
 * Handle-rename redirects are NOT done here — resolving them needs the catalog,
 * which is a Node-runtime read. The product and collection pages handle that
 * case themselves with a 308.
 */

const SESSION_COOKIE = '_tf_session';

/** Public /account routes: the auth flow itself must stay reachable. */
const PUBLIC_ACCOUNT_PATHS = new Set([
  '/account/login',
  '/account/authorize',
  '/account/callback',
  '/account/logout',
  '/account/unavailable',
]);

/** Legacy Shopify theme paths a customer or search engine may still hold. */
const LEGACY_REDIRECTS: { from: RegExp; to: (match: RegExpMatchArray) => string }[] = [
  { from: /^\/products\/([^/]+)\/?$/, to: (m) => `/products/${m[1]}` },
  { from: /^\/collections\/([^/]+)\/products\/([^/]+)\/?$/, to: (m) => `/products/${m[2]}` },
  { from: /^\/collections\/all\/?$/, to: () => '/collections' },
  { from: /^\/collections\/?$/, to: () => '/collections' },
  { from: /^\/pages\/([^/]+)\/?$/, to: (m) => `/pages/${m[1]}` },
  { from: /^\/search\/?$/, to: () => '/search' },
  { from: /^\/cart\/?$/, to: () => '/cart' },
  { from: /^\/account\/login\/?$/, to: () => '/account/login' },
];

export default function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  // ── Legacy URL normalization ────────────────────────────────────────
  for (const rule of LEGACY_REDIRECTS) {
    const match = pathname.match(rule.from);
    if (!match) continue;
    const target = rule.to(match);
    if (target !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = target;
      return NextResponse.redirect(url, 308);
    }
    break;
  }

  // ── Account guard ───────────────────────────────────────────────────
  if (pathname.startsWith('/account') && !PUBLIC_ACCOUNT_PATHS.has(pathname)) {
    // Presence-only check. The real authorization happens server-side in
    // requireCustomer() — a forged cookie fails there, not here.
    if (!request.cookies.has(SESSION_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = '/account/login';
      url.search = `?returnTo=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, the webhook endpoint (which must not be
     * redirected), and static files.
     */
    '/((?!_next/static|_next/image|api/webhooks|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
