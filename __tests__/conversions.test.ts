import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The orders/paid conversions, with fetch mocked: what Meta, GA4 and TikTok
 * actually receive for a paid order. Covers the fields each platform needs
 * (event name/id/time, action source + URL, hashed identity, fbp/fbc/
 * external_id, contents, value/currency) and the rule that only this
 * storefront's own line items are ever reported.
 */

const getProductById = vi.fn();
vi.mock('@/lib/catalog', () => ({ productRepository: { getProductById } }));

const { sendMetaPurchase, sendGa4Purchase, sendTikTokPurchase } = await import(
  '@/services/webhooks/conversions'
);

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

const OWN_PRODUCT = 111;
const OTHER_BRAND_PRODUCT = 999;

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 5550001,
    name: '#1001',
    currency: 'USD',
    total_price: '79.98',
    current_total_price: '79.98',
    email: ' Buyer@Example.com ',
    phone: '+1 (415) 555-0100',
    billing_address: {
      first_name: 'Ada',
      last_name: 'Lovelace',
      city: 'Austin',
      province_code: 'TX',
      zip: '78701',
      country_code: 'US',
    },
    note_attributes: [
      { name: '_fbp', value: 'fb.1.1700000000000.1234567890' },
      { name: '_fbc', value: 'fb.1.1700000000000.AbCdEf' },
      { name: '_external_id', value: '00000000-0000-4000-8000-000000000000' },
    ],
    client_details: { browser_ip: '203.0.113.7', user_agent: 'Buyer-Browser/1.0' },
    line_items: [
      { id: 1, product_id: OWN_PRODUCT, variant_id: 11, quantity: 2, price: '29.99', title: 'Wallet' },
      { id: 2, product_id: OWN_PRODUCT, variant_id: 12, quantity: 1, price: '20.00', title: 'Key holder' },
    ],
    ...overrides,
  };
}

const sent: { url: string; init: RequestInit & { body: string } }[] = [];
const body = (index = 0) => JSON.parse(sent[index]!.init.body);

beforeEach(() => {
  sent.length = 0;
  getProductById.mockReset();
  getProductById.mockImplementation(async (gid: string) =>
    gid.endsWith(`/${OWN_PRODUCT}`) ? { id: gid, metafields: {} } : null,
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit & { body: string }) => {
      sent.push({ url, init });
      return new Response('{}', { status: 200 });
    }),
  );
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.stubEnv('NEXT_PUBLIC_META_PIXEL_ID', '1234567890');
  vi.stubEnv('META_CAPI_ACCESS_TOKEN', 'meta-token');
  vi.stubEnv('META_GRAPH_API_VERSION', 'v21.0');
  vi.stubEnv('META_TEST_EVENT_CODE', '');
  vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST123');
  vi.stubEnv('GA_MP_API_SECRET', 'ga-secret');
  vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'TT_PIXEL');
  vi.stubEnv('TIKTOK_ACCESS_TOKEN', 'tt-token');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Meta Conversions API Purchase', () => {
  it('sends the event with every field Meta needs', async () => {
    await sendMetaPurchase(order() as never, '198.51.100.9', 'Shopify-Webhook-UA');

    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toBe('https://graph.facebook.com/v21.0/1234567890/events');
    const payload = body();
    expect(payload.access_token).toBe('meta-token');
    expect(payload.test_event_code).toBeUndefined();

    const event = payload.data[0];
    expect(event).toMatchObject({
      event_name: 'Purchase',
      event_id: 'purchase-5550001',
      action_source: 'website',
      event_source_url: 'https://example.test',
    });
    expect(Number.isInteger(event.event_time)).toBe(true);

    expect(event.custom_data).toEqual({
      currency: 'USD',
      value: 79.98,
      content_type: 'product',
      content_ids: ['11', '12'],
      contents: [
        { id: '11', quantity: 2, item_price: 29.99 },
        { id: '12', quantity: 1, item_price: 20 },
      ],
      num_items: 3,
      order_id: '5550001',
    });
  });

  it('hashes identity the way Meta specifies and passes the browser ids through', async () => {
    await sendMetaPurchase(order() as never, null, null);
    const user = body().data[0].user_data;

    expect(user.em).toEqual([sha('buyer@example.com')]);
    expect(user.ph).toEqual([sha('14155550100')]);
    expect(user.fn).toEqual([sha('ada')]);
    expect(user.ln).toEqual([sha('lovelace')]);
    expect(user.ct).toEqual([sha('austin')]);
    expect(user.st).toEqual([sha('tx')]);
    expect(user.zp).toEqual([sha('78701')]);
    expect(user.country).toEqual([sha('us')]);

    // Browser identifiers are not PII and are sent as captured.
    expect(user.fbp).toBe('fb.1.1700000000000.1234567890');
    expect(user.fbc).toBe('fb.1.1700000000000.AbCdEf');
    expect(user.external_id).toEqual(['00000000-0000-4000-8000-000000000000']);
  });

  it("uses the buyer's IP and user agent from the order, not the webhook sender's", async () => {
    await sendMetaPurchase(order() as never, '198.51.100.9', 'Shopify-Webhook-UA');
    const user = body().data[0].user_data;
    expect(user.client_ip_address).toBe('203.0.113.7');
    expect(user.client_user_agent).toBe('Buyer-Browser/1.0');
  });

  it("falls back to the request's IP and user agent when the order carries none", async () => {
    await sendMetaPurchase(order({ client_details: null }) as never, '198.51.100.9', 'Webhook-UA');
    const user = body().data[0].user_data;
    expect(user.client_ip_address).toBe('198.51.100.9');
    expect(user.client_user_agent).toBe('Webhook-UA');
  });

  it('tags the event as test traffic when a test code is set', async () => {
    vi.stubEnv('META_TEST_EVENT_CODE', 'TEST123');
    await sendMetaPurchase(order() as never, null, null);
    expect(body().test_event_code).toBe('TEST123');
  });

  it('sends nothing when the pixel or token is missing', async () => {
    vi.stubEnv('META_CAPI_ACCESS_TOKEN', '');
    await sendMetaPurchase(order() as never, null, null);
    expect(sent).toHaveLength(0);
  });

  it("never reports another brand's items, and values only the lines that are ours", async () => {
    const mixed = order({
      total_price: '129.98',
      current_total_price: '129.98',
      line_items: [
        { id: 1, product_id: OWN_PRODUCT, variant_id: 11, quantity: 1, price: '29.99', title: 'Wallet' },
        { id: 2, product_id: OTHER_BRAND_PRODUCT, variant_id: 99, quantity: 2, price: '50.00', title: 'Serum' },
      ],
    });
    await sendMetaPurchase(mixed as never, null, null);

    const custom = body().data[0].custom_data;
    expect(custom.content_ids).toEqual(['11']);
    expect(custom.num_items).toBe(1);
    expect(custom.value).toBe(29.99);
  });

  it('skips an order with none of our items', async () => {
    const foreign = order({
      line_items: [
        { id: 2, product_id: OTHER_BRAND_PRODUCT, variant_id: 99, quantity: 1, price: '50.00', title: 'Serum' },
      ],
    });
    await sendMetaPurchase(foreign as never, null, null);
    expect(sent).toHaveLength(0);
  });

  it('routes a product with its own pixel to that pixel, without double counting', async () => {
    getProductById.mockImplementation(async (gid: string) =>
      gid.endsWith(`/${OWN_PRODUCT}`)
        ? { id: gid, metafields: { 'custom.meta_pixel_id': '5550009999' } }
        : null,
    );
    await sendMetaPurchase(order() as never, null, null);

    // Every line belongs to the product pixel, so the global pixel gets nothing.
    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toContain('/5550009999/events');
    const event = body().data[0];
    expect(event.event_id).toBe('purchase-5550001-pixel-5550009999');
    expect(event.custom_data.value).toBe(79.98);
  });
});

describe('GA4 Measurement Protocol purchase', () => {
  it('sends the purchase with transaction, value and items', async () => {
    await sendGa4Purchase(order() as never);

    expect(sent).toHaveLength(1);
    const url = new URL(sent[0]!.url);
    expect(url.origin + url.pathname).toBe('https://www.google-analytics.com/mp/collect');
    expect(url.searchParams.get('measurement_id')).toBe('G-TEST123');
    expect(url.searchParams.get('api_secret')).toBe('ga-secret');

    const payload = body();
    expect(payload.client_id).toBe('order-5550001.trackify');
    expect(payload.events).toEqual([
      {
        name: 'purchase',
        params: {
          currency: 'USD',
          value: 79.98,
          transaction_id: '5550001',
          items: [
            { item_id: '11', item_name: 'Wallet', price: 29.99, quantity: 2 },
            { item_id: '12', item_name: 'Key holder', price: 20, quantity: 1 },
          ],
        },
      },
    ]);
  });

  it("leaves out another brand's items from the purchase", async () => {
    const mixed = order({
      current_total_price: '129.98',
      line_items: [
        { id: 1, product_id: OWN_PRODUCT, variant_id: 11, quantity: 1, price: '29.99', title: 'Wallet' },
        { id: 2, product_id: OTHER_BRAND_PRODUCT, variant_id: 99, quantity: 2, price: '50.00', title: 'Serum' },
      ],
    });
    await sendGa4Purchase(mixed as never);
    const params = body().events[0].params;
    expect(params.items).toHaveLength(1);
    expect(params.value).toBe(29.99);
  });

  it('sends nothing without a secret', async () => {
    vi.stubEnv('GA_MP_API_SECRET', '');
    await sendGa4Purchase(order() as never);
    expect(sent).toHaveLength(0);
  });
});

describe('TikTok Events API Purchase', () => {
  it('sends the purchase with hashed contact data and contents', async () => {
    await sendTikTokPurchase(order() as never, '198.51.100.9', 'Webhook-UA');

    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toBe('https://business-api.tiktok.com/open_api/v1.3/event/track/');
    expect((sent[0]!.init.headers as Record<string, string>)['Access-Token']).toBe('tt-token');

    const payload = body();
    expect(payload).toMatchObject({ event_source: 'web', event_source_id: 'TT_PIXEL' });
    const event = payload.data[0];
    expect(event).toMatchObject({ event: 'Purchase', event_id: 'purchase-5550001' });
    expect(event.user).toEqual({
      ip: '203.0.113.7',
      user_agent: 'Buyer-Browser/1.0',
      email: [sha('buyer@example.com')],
      phone_number: [sha('14155550100')],
    });
    expect(event.properties).toEqual({
      contents: [
        { content_id: '11', content_type: 'product', content_name: 'Wallet', quantity: 2, price: 29.99 },
        { content_id: '12', content_type: 'product', content_name: 'Key holder', quantity: 1, price: 20 },
      ],
      content_type: 'product',
      currency: 'USD',
      value: 79.98,
    });
  });

  it('sends nothing without a token', async () => {
    vi.stubEnv('TIKTOK_ACCESS_TOKEN', '');
    await sendTikTokPurchase(order() as never, null, null);
    expect(sent).toHaveLength(0);
  });
});
