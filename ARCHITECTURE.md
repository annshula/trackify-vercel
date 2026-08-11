# Trackify Storefront — Architecture

A premium headless Shopify storefront. Shopify is the commerce source of truth; this app is
the entire customer-facing experience. Single store, single deployment, no multi-tenancy.

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ BROWSER (Next.js client)                                             │
│  Server-rendered HTML · minimal hydration islands                    │
│  Public creds only: Storefront public token, store domain, site URL  │
└───────────────┬──────────────────────────────────────────────────────┘
                │ HTTPS
┌───────────────▼──────────────────────────────────────────────────────┐
│ NEXT.JS APP ROUTER (server)                                          │
│                                                                      │
│  ┌── Read path (fast, no Shopify call) ─────────────────────────┐    │
│  │ RSC page → ProductRepository → data/products.json (cached)   │    │
│  │ Powers: PDP, PLP, search, recommendations, SEO, sitemap      │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌── Commerce path (authoritative, live) ───────────────────────┐    │
│  │ Server Actions → StorefrontService → Storefront API          │    │
│  │ Cart create/add/update/remove/discount → checkoutUrl         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌── Customer path (authenticated) ─────────────────────────────┐    │
│  │ OAuth2 + PKCE → CustomerAccountService → Customer Account API│    │
│  │ Orders · profile · addresses. Tokens in httpOnly cookies.    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌── Merchant path (server-only, protected) ────────────────────┐    │
│  │ AdminService → Admin GraphQL API                             │    │
│  │ Sync · webhook reconciliation · diagnostics                  │    │
│  └──────────────────────────────────────────────────────────────┘    │
└───────┬──────────────────────────────┬───────────────────────────────┘
        │ webhooks (HMAC verified)     │ redirect
┌───────▼──────────────────────────────▼───────────────────────────────┐
│ SHOPIFY  — products · inventory · cart · checkout · payments ·       │
│            orders · customers · taxes · shipping                     │
└──────────────────────────────────────────────────────────────────────┘
```

**Core rule:** never query Shopify to _render_ a product page. Query Shopify to _transact_.

---

## 2. API Architecture

| API              | Runs             | Credential                                                                                                                                                   | Used for                                                                             |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Admin GraphQL    | server only      | `SHOPIFY_ADMIN_API_TOKEN` (custom-app token) **or** `SHOPIFY_ADMIN_CLIENT_ID` + `SHOPIFY_ADMIN_CLIENT_SECRET` (client credentials grant → 24h token, cached) | full sync, webhook re-fetch, collections, publication state, metafields, diagnostics |
| Storefront       | server (proxied) | `SHOPIFY_STOREFRONT_API_TOKEN` (public token)                                                                                                                | cart lifecycle, live variant availability, discount codes, checkout URL              |
| Customer Account | server           | `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` (+ secret if confidential)                                                                                              | login, orders, order detail, profile, addresses                                      |
| Webhooks         | inbound          | `SHOPIFY_WEBHOOK_SECRET`                                                                                                                                     | catalog invalidation + incremental update                                            |
| Checkout         | browser redirect | —                                                                                                                                                            | payment, tax, shipping, order creation                                               |

All Shopify traffic is server-side. The browser never holds an Admin token, never sees a
customer access token, and never issues a raw GraphQL request.

---

## 3. Folder Structure

```
app/
  layout.tsx  page.tsx  error.tsx  not-found.tsx  globals.css
  sitemap.ts  robots.ts  opengraph-image.tsx
  products/[handle]/page.tsx
  collections/page.tsx  collections/[handle]/page.tsx
  search/page.tsx
  cart/page.tsx
  pages/[handle]/page.tsx
  account/ (login, callback, logout, orders, orders/[id], profile, addresses, settings)
  api/
    webhooks/shopify/route.ts
    search/route.ts
    admin/(sync|health|revalidate)/route.ts
components/
  ui/         Button Input Badge Drawer Dialog Toast Skeleton Price Rating Tabs Accordion …
  layout/     Header MobileNav Footer AnnouncementBar BottomBar
  product/    Gallery VariantSelector BuyBox StickyBuyBar Details Reviews Related …
  collection/ Grid FilterPanel FilterDrawer SortMenu Pagination
  cart/       CartDrawer CartLine CartSummary DiscountForm FreeShipMeter
  account/    Dashboard OrderCard OrderTimeline AddressForm ProfileForm
  search/     SearchOverlay SearchResults
lib/
  shopify/    admin.ts storefront.ts customer-account.ts queries/ errors.ts
  catalog/    repository.ts json-repository.ts normalize.ts search.ts recommendations.ts
  cart/       actions.ts cookies.ts
  auth/       pkce.ts session.ts guard.ts
  seo/        metadata.ts jsonld.ts
  analytics/  index.ts events.ts providers/
  validation/ schema.ts env.ts
  utils/      money.ts cn.ts image.ts
services/
  shopify/    ShopifyAdminService ShopifyStorefrontService ShopifyCustomerAccountService …
  synchronization/ SyncService lock.ts
  webhooks/   handlers.ts dedupe.ts
scripts/      sync.ts validate.ts test-webhook.ts
data/         products.json collections.json redirects.json .sync-state.json
types/  hooks/  __tests__/  public/
```

---

## 4. Product Data Schema

`data/products.json` = `{ version, generatedAt, shop, products[] }`.

```ts
Product {
  id, handle, title, description, descriptionHtml, vendor, productType,
  tags[], collections[{id,handle,title}], images[{id,url,altText,width,height}],
  media[{type:'image'|'video'|'external_video'|'model_3d', ...}],
  seo{title,description}, status, publishedAt, createdAt, updatedAt,
  priceRange{min,max,currencyCode}, options[{name,values[]}],
  metafields{ [namespace.key]: string },
  variants[ Variant ]
}
Variant {
  id, title, sku, price, compareAtPrice, currencyCode,
  selectedOptions[{name,value}], imageId, availableForSale,
  inventoryQuantity, inventoryPolicy, requiresShipping, weight
}
```

Public-safe only. No customer data, no cost, no merchant-private metafields
(namespace allowlist enforced in `normalize.ts`).

---

## 5. Product Synchronization Strategy

`npm run shopify:sync` → `SyncService.fullSync()`

1. Acquire file lock (`data/.sync.lock`) — prevents overlap with webhook writes.
2. Paginate `products(first:50, after:$cursor)` on Admin GraphQL, with nested
   variants / media / collections / metafields / SEO / publication state.
3. Paginate `collections`.
4. Normalize → validate against Zod schema → reject the run on schema failure.
5. Atomic write: temp file → `fs.rename` (never a partial `products.json`).
6. Diff old vs new handles → append to `redirects.json` when a product ID keeps its
   identity but changes handle.
7. Print stats: products, variants, images, collections, added/updated/removed, duration.

Idempotent: same Shopify state ⇒ byte-identical output (stable key ordering, sorted arrays).

---

## 6. Webhook Strategy

`POST /api/webhooks/shopify` (Node runtime, raw body).

```
raw body → HMAC SHA256 (timing-safe) → reject 401
        → X-Shopify-Webhook-Id seen before? → 200 (dedupe, no work)
        → topic router → re-fetch authoritative record via Admin API
        → mutate ONLY affected records under lock
        → atomic persist
        → revalidateTag / revalidatePath for affected routes
        → 200 within budget (heavy work never blocks the ack path)
```

Topics: `products/create|update|delete`, `inventory_levels/update`,
`collections/create|update|delete`, `product_listings/add|remove`, `shop/redact`.

Never full-rebuild on an inventory tick. Dedupe cache is bounded LRU keyed by webhook ID.
Ordering guarded by comparing Shopify `updatedAt` — a stale event is dropped.

---

## 7. Webhook Reliability

- Duplicate/retry: webhook-ID LRU + `updatedAt` monotonicity check.
- Concurrency: single async mutex serializes all catalog writes in-process; file lock guards
  cross-process (sync script vs server).
- Failure: return 5xx so Shopify retries; log topic + id + error, never payload secrets.
- Safe writes: read → mutate in memory → validate → temp write → atomic rename.

---

## 8. Customer Authentication Architecture

Shopify Customer Account API, OAuth 2.0 **Authorization Code + PKCE**.

```
/account/login
  → generate code_verifier + S256 challenge + state + nonce
  → store in httpOnly, SameSite=Lax, short-TTL cookies
  → 302 to shopify OAuth /auth/oauth/authorize
/account/callback
  → verify state → exchange code (+verifier) at /auth/oauth/token
  → receive access_token + refresh_token + id_token
  → encrypt & store in httpOnly Secure cookies (AES-256-GCM, SESSION_SECRET)
  → redirect to original destination
```

Refresh on expiry via refresh_token; on refresh failure clear session and re-auth.
`/account/logout` clears cookies and hits Shopify's logout endpoint.
Route guard in `lib/auth/guard.ts`; middleware protects `/account/*` except login/callback.
No password ever touches this app. No customer table.

---

## 9. Customer Account API Architecture

`ShopifyCustomerAccountService` — server-only, token injected per request from session.
Queries: `customer`, `customer.orders`, `order(id)`, `customerUpdate`,
`customerAddressCreate|Update|Delete`, `customerDefaultAddressUpdate`.
Every call is scoped by the customer's own token → cross-customer access is impossible by
construction. Responses are never cached in a shared cache (`cache: 'no-store'`).

---

## 10. Cart Architecture

Shopify Storefront `cart`. One cart ID in an httpOnly cookie (`_tf_cart`, 30 days).

```
Server Action → StorefrontService.cart*() → Storefront API
              → revalidateTag('cart') → RSC re-render → optimistic UI settles
```

`cartCreate`, `cartLinesAdd/Update/Remove`, `cartDiscountCodesUpdate`,
`cartBuyerIdentityUpdate` (attaches logged-in customer). No local cart DB.
Missing/expired cart ID → transparently create a new cart.

## 11. Checkout Architecture

`Checkout` button → validate cart server-side → `window.location = cart.checkoutUrl`.
Shopify owns payment, tax, shipping, order creation. Zero payment code here.

## 12. Order History Architecture

Customer Account API only. Orders list paginated; detail page renders line items, money
breakdown, addresses, fulfillments and tracking URLs exactly as Shopify reports them.
Status timeline is derived from real fulfillment/financial status — nothing invented.

---

## 13. URL Preservation Strategy

`/products/{shopify.handle}` and `/collections/{shopify.handle}` — handles copied verbatim,
never re-slugified. `RedirectRepository` (`data/redirects.json`) maps `oldHandle → newHandle`
per resource type; `middleware.ts` issues a 308 on a miss-then-hit. Canonical tag always
points at the current handle.

## 14. SEO Strategy

SSG + ISR for PDP/PLP (`generateStaticParams`, tag-based revalidation from webhooks).
`generateMetadata` per route: title, description, canonical, OG, Twitter.
JSON-LD: Product (+Offer/AggregateRating when real review data exists), BreadcrumbList,
Organization, WebSite+SearchAction. `app/sitemap.ts` enumerates the local catalog.
Full product HTML ships in the first response — no client fetch required.

## 15. Caching / Revalidation Strategy

| Layer           | Policy                                                               |
| --------------- | -------------------------------------------------------------------- |
| `products.json` | read once per process, in-memory + `unstable_cache` tagged `catalog` |
| PDP / PLP       | ISR, tags `product:{handle}`, `collection:{handle}`, `catalog`       |
| Cart            | `no-store`, tag `cart`                                               |
| Customer data   | `no-store`, never shared cache                                       |
| Images          | `next/image` + Shopify CDN, AVIF/WebP, explicit sizes                |

Webhooks call `revalidateTag` on exactly the affected tags.

## 16. Security Model

Server-only secrets (`lib/validation/env.ts` fails fast at boot, and throws if a secret name
appears under `NEXT_PUBLIC_`). Timing-safe webhook HMAC. Encrypted httpOnly SameSite cookies.
Zod validation on every external input. Rate limiting on `/api/*`. Admin utility routes
behind a bearer token + `noindex`. CSP, HSTS, X-Content-Type-Options, Referrer-Policy.
No tokens or PII in logs.

---

## 17. Design System

Editorial-premium, not a Shopify theme, not a Tailwind template.

- **Type:** Sora (display/headings) + Inter (UI/body). Fluid `clamp()` scale.
- **Color:** ink `#1C1917` primary · warm gold `#A16207` accent (WCAG-adjusted) ·
  stone-tinted neutrals `#FAFAF9`→`#0C0A09` · full light/dark token parity.
- **Space:** 4px base, standard density scale (16→64px sections).
- **Radius/Shadow:** soft-UI evolution — 2/8/16/24px radii, layered low-opacity shadows.
- **Motion:** 150–300ms, `cubic-bezier(.2,.8,.2,1)`; stagger reveals on grids;
  `prefers-reduced-motion` fully honored.
- **Components:** Button, Input, Select, Badge, Card, ProductCard, Drawer, Dialog,
  BottomSheet, Toast, Tabs, Accordion, Skeleton, EmptyState, Price, Rating, Breadcrumb.

## 18. Mobile UX Strategy

Mobile-first at every breakpoint (320/360/375/390/414/768/1024/1280+). Sticky slim header,
bottom tab bar, swipe gallery with snap points, sticky add-to-cart on PDP, bottom-sheet
filters/sort/cart, ≥44×44px targets with ≥8px spacing, `env(safe-area-inset-*)` padding,
zero horizontal overflow, no hover-only affordances.

## 19. Testing Strategy

Vitest. Catalog: normalize, schema validation, repository CRUD, search ranking, redirects.
Sync: pagination, idempotency, atomic write, diff. Webhooks: HMAC valid/invalid/tampered,
dedupe, stale-event drop, concurrent-write safety. Cart: create/add/update/remove/checkout
URL against a mocked Storefront transport. Auth: PKCE challenge, state mismatch rejection,
session encrypt/decrypt, expiry, guard redirects. SEO: metadata, JSON-LD shape, sitemap.

## 20. Deployment & Roadmap

**Deploy:** Vercel (Node runtime for webhooks/sync). Env vars set server-side.
`products.json` ships in the build; webhooks update the running instance and revalidate.
On a multi-instance deploy, swap `JsonProductRepository` for a KV/Postgres implementation —
the interface does not change.

**Roadmap:** ① scaffold + design system → ② Shopify clients + catalog + sync →
③ webhooks + revalidation → ④ storefront routes → ⑤ cart + checkout →
⑥ auth + account → ⑦ SEO + analytics → ⑧ tests + quality gates.

**Setup order (Shopify admin):** install Headless channel → create storefront → copy public
Storefront token → enable Customer Account API, set callback `https://<site>/account/callback`

- logout URI + JS origin → create custom app with `read_products, read_inventory,
read_product_listings, read_publications` → register webhooks → fill `.env.local` →
  `npm run shopify:sync`.
