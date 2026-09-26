import "server-only";
import { createHash } from "node:crypto";
import { productRepository } from "@/lib/catalog";

/**
 * Server-side purchase conversions — Meta Conversions API, GA4 Measurement
 * Protocol, TikTok Events API.
 *
 * The shopper pays on Shopify's hosted checkout and never returns to a
 * client-side success page here, so the browser pixels (Meta/GA4/TikTok in
 * components/analytics/) never see the actual purchase. These three senders
 * forward a Purchase/purchase event from the orders/paid webhook instead —
 * see services/webhooks/handlers.ts's 'orders/paid' case.
 *
 * Every provider is independently optional: a missing token skips just that
 * one provider and logs why, so a store that only has GA4 configured still
 * gets working purchase tracking there while Meta/TikTok silently no-op.
 */

type ShopifyLineItem = {
  id: number;
  product_id?: number | null;
  variant_id?: number | null;
  quantity?: number;
  price?: string | number;
  title?: string;
};

type ShopifyAddress = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  province_code?: string | null;
  zip?: string | null;
  country_code?: string | null;
};

export type ShopifyOrder = {
  id: number;
  name?: string;
  currency?: string;
  total_price?: string | number;
  current_total_price?: string | number;
  line_items?: ShopifyLineItem[];
  email?: string | null;
  phone?: string | null;
  customer?: { email?: string | null; phone?: string | null } | null;
  billing_address?: ShopifyAddress | null;
};

/** Meta/TikTok require PII lowercased + trimmed, then SHA-256 hex — never sent raw. */
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashField(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? sha256(trimmed) : undefined;
}

/** Digits only (Meta's phone spec drops symbols/leading zeros, keeps the country code). */
function hashPhone(value: string | null | undefined): string | undefined {
  const digits = value?.replace(/[^0-9]/g, "");
  return digits ? sha256(digits) : undefined;
}

const PRODUCT_PIXEL_ID_PATTERN = /^[0-9]{6,20}$/;

const productGid = (id: string | number) =>
  String(id).startsWith("gid://") ? String(id) : `gid://shopify/Product/${id}`;

/**
 * A product pixel from a different Meta Business (its own ad account, its
 * own dataset) needs its own Conversions API token — the global
 * META_CAPI_ACCESS_TOKEN only has access to pixels *its* Business granted it.
 * `META_CAPI_ACCESS_TOKEN_<pixelId>` overrides the global token for that one
 * pixel; falls back to the global token when unset, which covers the common
 * case of multiple pixels under the same Business sharing one token.
 */
function accessTokenForPixel(pixelId: string, globalToken: string): string {
  return process.env[`META_CAPI_ACCESS_TOKEN_${pixelId}`]?.trim() || globalToken;
}

/**
 * Groups an order's line items by the `custom.meta_pixel_id` metafield of
 * their product, so each distinct product pixel gets one Purchase event
 * scoped to just its own items — mirrors the client-side split in
 * components/analytics/product-meta-pixel.tsx and lib/analytics/index.ts's
 * trackSingle routing. Line items whose product has no (valid) pixel id, or
 * whose product lookup fails, are left out — they're still covered by the
 * single global-pixel event in sendMetaPurchase.
 */
async function groupLineItemsByProductPixel(
  items: ShopifyLineItem[],
): Promise<Map<string, ShopifyLineItem[]>> {
  const groups = new Map<string, ShopifyLineItem[]>();
  await Promise.all(
    items.map(async (item) => {
      if (item.product_id === undefined || item.product_id === null) return;
      const product = await productRepository
        .getProductById(productGid(item.product_id))
        .catch(() => null);
      const pixelId = product?.metafields["custom.meta_pixel_id"];
      if (!pixelId || !PRODUCT_PIXEL_ID_PATTERN.test(pixelId)) return;
      const existing = groups.get(pixelId);
      if (existing) existing.push(item);
      else groups.set(pixelId, [item]);
    }),
  );
  return groups;
}

/** Advanced-matching fields shared by an order's billing contact, hashed once for reuse across providers. */
function customerMatchData(order: ShopifyOrder) {
  const address = order.billing_address ?? undefined;
  return {
    em: hashField(order.email ?? order.customer?.email),
    ph: hashPhone(order.phone ?? order.customer?.phone ?? address?.phone),
    fn: hashField(address?.first_name),
    ln: hashField(address?.last_name),
    ct: hashField(address?.city),
    st: hashField(address?.province_code),
    zp: hashField(address?.zip),
    country: hashField(address?.country_code),
  };
}

/** Posts one Meta CAPI Purchase event, scoped to `items`, to a single pixel. */
async function postMetaPurchaseEvent(params: {
  order: ShopifyOrder;
  pixelId: string;
  accessToken: string;
  version: string;
  testEventCode: string | undefined;
  items: ShopifyLineItem[];
  value: number;
  eventId: string;
  userData: Record<string, unknown>;
}): Promise<void> {
  const { order, pixelId, accessToken, version, testEventCode, items, value, eventId, userData } = params;
  try {
    const response = await fetch(
      `https://graph.facebook.com/${version}/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          ...(testEventCode ? { test_event_code: testEventCode } : {}),
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              action_source: "website",
              user_data: userData,
              custom_data: {
                currency: order.currency ?? "USD",
                value,
                content_type: "product",
                content_ids: items.map((i) => String(i.variant_id ?? i.id)),
                // `contents` (id + quantity + item_price) is the richer of
                // the two catalog-matching fields Meta's docs recommend
                // alongside content_ids — carries per-item price/qty that
                // content_ids alone can't.
                contents: items.map((i) => ({
                  id: String(i.variant_id ?? i.id),
                  quantity: i.quantity ?? 1,
                  item_price: Number(i.price ?? 0),
                })),
                content_name: items.length === 1 ? items[0]!.title : undefined,
                num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
                order_id: String(order.id),
              },
            },
          ],
        }),
      },
    );
    const text = await response.text();
    console.log(
      `[webhook] Meta CAPI status ${response.status} for order ${order.id} (pixel ${pixelId}): ${text.slice(0, 500)}`,
    );
  } catch (error) {
    console.error(
      `[webhook] Meta CAPI request failed for order ${order.id} (pixel ${pixelId}):`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Meta Conversions API `Purchase` event. No-op without a pixel + access token.
 *
 * Sends one event per distinct product pixel found among the order's line
 * items (via `custom.meta_pixel_id`), each scoped to just that pixel's own
 * items — plus one event to the global pixel for whatever's left over. Every
 * line item lands on exactly one pixel's event, so an order's value is never
 * double-counted across pixels combined; a product with no pixel id simply
 * stays on the global event. A product pixel from a different Meta Business
 * needs its own token — see accessTokenForPixel's
 * `META_CAPI_ACCESS_TOKEN_<pixelId>` override.
 */
export async function sendMetaPurchase(
  order: ShopifyOrder,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  const version = process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";
  // Meta Events Manager → Test Events issues a per-account code that tags an
  // event as test traffic: it shows up live in that tool but is excluded from
  // ad optimization and reporting. Unset in production; set locally or in a
  // staging env when verifying this pipeline end-to-end so a manual test
  // never counts as a real conversion.
  const testEventCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (!pixelId || !accessToken) {
    console.log(
      `[webhook] Meta CAPI skipped for order ${order.id}: NEXT_PUBLIC_META_PIXEL_ID or META_CAPI_ACCESS_TOKEN not set`,
    );
    return;
  }

  const items = order.line_items ?? [];
  if (items.length === 0) {
    console.log(`[webhook] Meta CAPI skipped for order ${order.id}: no line items`);
    return;
  }

  // Meta's advanced-matching fields (em/ph/fn/ln/ct/st/zp/country) are the
  // strongest signals in Event Match Quality — stronger than IP/UA combined —
  // and each takes an array of hashed values per Meta's spec.
  const match = customerMatchData(order);
  const userData = {
    client_ip_address: ip ?? undefined,
    client_user_agent: userAgent ?? undefined,
    em: match.em ? [match.em] : undefined,
    ph: match.ph ? [match.ph] : undefined,
    fn: match.fn ? [match.fn] : undefined,
    ln: match.ln ? [match.ln] : undefined,
    ct: match.ct ? [match.ct] : undefined,
    st: match.st ? [match.st] : undefined,
    zp: match.zp ? [match.zp] : undefined,
    country: match.country ? [match.country] : undefined,
  };

  const productPixelGroups = await groupLineItemsByProductPixel(items);

  // Every item that went to its own product pixel is dropped from the
  // global event, so an order's value is never counted twice across pixels
  // combined — each line item's revenue lands on exactly one pixel total.
  const routedItemIds = new Set(
    Array.from(productPixelGroups.values()).flatMap((group) => group.map((i) => i.id)),
  );
  const globalItems = items.filter((i) => !routedItemIds.has(i.id));
  const globalValue =
    routedItemIds.size === 0
      ? Number(order.current_total_price ?? order.total_price ?? 0)
      : globalItems.reduce((sum, i) => sum + Number(i.price ?? 0) * (i.quantity ?? 1), 0);

  await Promise.all([
    // Skip entirely once every item routed elsewhere — an empty Purchase
    // event has no items/value and Meta would reject or misreport it.
    globalItems.length === 0
      ? Promise.resolve()
      : postMetaPurchaseEvent({
          order,
          pixelId,
          accessToken,
          version,
          testEventCode,
          items: globalItems,
          value: globalValue,
          eventId: `purchase-${order.id}`,
          userData,
        }),
    ...Array.from(productPixelGroups.entries()).map(([productPixelId, groupItems]) => {
      // Scoped value: just this pixel's items, priced off the order's own
      // per-line price (avoids re-deriving from order-level discounts/tax).
      const groupValue = groupItems.reduce(
        (sum, i) => sum + Number(i.price ?? 0) * (i.quantity ?? 1),
        0,
      );
      return postMetaPurchaseEvent({
        order,
        pixelId: productPixelId,
        accessToken: accessTokenForPixel(productPixelId, accessToken),
        version,
        testEventCode,
        items: groupItems,
        value: groupValue,
        eventId: `purchase-${order.id}-pixel-${productPixelId}`,
        userData,
      });
    }),
  ]);
}

/** GA4 Measurement Protocol `purchase` event. No-op without an API secret. */
export async function sendGa4Purchase(order: ShopifyOrder): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA_MP_API_SECRET?.trim();
  if (!measurementId || !apiSecret) {
    console.log(
      `[webhook] GA4 MP skipped for order ${order.id}: NEXT_PUBLIC_GA_MEASUREMENT_ID or GA_MP_API_SECRET not set`,
    );
    return;
  }

  const items = (order.line_items ?? []).map((line) => ({
    item_id: String(line.variant_id ?? line.id),
    item_name: line.title ?? "",
    price: Number(line.price ?? 0),
    quantity: line.quantity ?? 1,
  }));
  if (items.length === 0) {
    console.log(`[webhook] GA4 MP skipped for order ${order.id}: no line items`);
    return;
  }

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?api_secret=${encodeURIComponent(apiSecret)}&measurement_id=${encodeURIComponent(measurementId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // One stable server-side client per order, so the purchase is not
          // counted as its own brand-new "user".
          client_id: `order-${order.id}.trackify`,
          events: [
            {
              name: "purchase",
              params: {
                currency: order.currency ?? "USD",
                value: Number(
                  order.current_total_price ?? order.total_price ?? 0,
                ),
                transaction_id: String(order.id),
                items,
              },
            },
          ],
        }),
      },
    );
    const text = await response.text();
    console.log(
      `[webhook] GA4 MP status ${response.status} for order ${order.id}: ${text.slice(0, 500)}`,
    );
  } catch (error) {
    console.error(
      `[webhook] GA4 MP request failed for order ${order.id}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/** TikTok Events API `Purchase` event. No-op without a pixel + access token. */
export async function sendTikTokPurchase(
  order: ShopifyOrder,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim();
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) {
    console.log(
      `[webhook] TikTok Events API skipped for order ${order.id}: NEXT_PUBLIC_TIKTOK_PIXEL_ID or TIKTOK_ACCESS_TOKEN not set`,
    );
    return;
  }

  const items = order.line_items ?? [];
  if (items.length === 0) {
    console.log(`[webhook] TikTok Events API skipped for order ${order.id}: no line items`);
    return;
  }

  const value = Number(order.current_total_price ?? order.total_price ?? 0);

  // Same hashed-identity boost as Meta CAPI above — TikTok's Events API
  // matches on `email`/`phone_number` (each a hashed array) too.
  const match = customerMatchData(order);

  try {
    const response = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/event/track/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify({
          event_source: "web",
          event_source_id: pixelId,
          data: [
            {
              event: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              event_id: `purchase-${order.id}`,
              user: {
                ip: ip ?? undefined,
                user_agent: userAgent ?? undefined,
                email: match.em ? [match.em] : undefined,
                phone_number: match.ph ? [match.ph] : undefined,
              },
              properties: {
                contents: items.map((i) => ({
                  content_id: String(i.variant_id ?? i.id),
                  content_type: "product",
                  content_name: i.title,
                  quantity: i.quantity ?? 1,
                  price: Number(i.price ?? 0),
                })),
                content_type: "product",
                currency: order.currency ?? "USD",
                value,
              },
            },
          ],
        }),
      },
    );
    const text = await response.text();
    console.log(
      `[webhook] TikTok Events API status ${response.status} for order ${order.id}: ${text.slice(0, 500)}`,
    );
  } catch (error) {
    console.error(
      `[webhook] TikTok Events API request failed for order ${order.id}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/** Fires all three purchase conversions in parallel; each is independently best-effort. */
export async function sendPurchaseConversions(
  order: ShopifyOrder,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  await Promise.allSettled([
    sendMetaPurchase(order, ip, userAgent),
    sendGa4Purchase(order),
    sendTikTokPurchase(order, ip, userAgent),
  ]);
}
