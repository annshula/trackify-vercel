import "server-only";
import { createHash } from "node:crypto";

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

/** Meta Conversions API `Purchase` event. No-op without a pixel + access token. */
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

  const value = Number(order.current_total_price ?? order.total_price ?? 0);

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
              event_id: `purchase-${order.id}`,
              action_source: "website",
              user_data: userData,
              custom_data: {
                currency: order.currency ?? "USD",
                value,
                content_ids: items.map((i) => String(i.variant_id ?? i.id)),
                content_type: "product",
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
      `[webhook] Meta CAPI status ${response.status} for order ${order.id}: ${text.slice(0, 500)}`,
    );
  } catch (error) {
    console.error(
      `[webhook] Meta CAPI request failed for order ${order.id}:`,
      error instanceof Error ? error.message : error,
    );
  }
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
