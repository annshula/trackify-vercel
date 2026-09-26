'use client';

/**
 * Analytics abstraction.
 *
 * One `track()` call fans out to whichever providers are configured (GA4,
 * Meta Pixel, TikTok Pixel — each only installs its `window.*` global when
 * its own env var is set, so an unconfigured provider is a silent no-op).
 * Providers load unconditionally, matching components/analytics/*; no
 * personally identifying data is ever put into an event payload regardless.
 */

export type EcommerceItem = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
};

export type AnalyticsEvents = {
  page_view: { page_path: string; page_title?: string };
  view_item_list: { item_list_id?: string; item_list_name?: string; items: EcommerceItem[] };
  view_item: { currency?: string; value?: number; items: EcommerceItem[] };
  select_item: { item_list_name?: string; items: EcommerceItem[] };
  search: { search_term: string; results_count?: number };
  add_to_cart: { currency?: string; value?: number; items: EcommerceItem[] };
  remove_from_cart: { currency?: string; value?: number; items: EcommerceItem[] };
  view_cart: { currency?: string; value?: number };
  begin_checkout: { currency?: string; value?: number; items?: EcommerceItem[] };
  add_to_wishlist: { items: EcommerceItem[] };
  login: { method: string };
  logout: Record<string, never>;
  sign_up: { method: string };
};

type WindowWithProviders = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
  ttq?: { track: (...args: unknown[]) => void };
};

/**
 * GA4's ecommerce shape (`items: EcommerceItem[]`) doesn't match what Meta's
 * pixel expects — Meta wants a flat object with `content_ids`/`content_type`/
 * `contents`, not a nested `items` array (see developers.facebook.com/docs/
 * meta-pixel/reference). Passing GA4 params straight through means Meta
 * silently drops `items` and never receives `content_ids`/`contents` at all,
 * which is exactly the fields Event Match Quality and catalog/Advantage+ ads
 * rely on. This reshapes GA4 params into Meta's expected fields whenever the
 * event carries `items`; anything without `items` (search, sign_up, ...)
 * passes through unchanged since those events have no product content.
 */
function toMetaCustomData(params: Record<string, unknown>): Record<string, unknown> {
  const items = params.items as
    | { item_id: string; item_name?: string; price?: number; quantity?: number }[]
    | undefined;
  if (!items) return params;

  const { items: _items, ...rest } = params;
  return {
    ...rest,
    content_type: 'product',
    content_ids: items.map((item) => item.item_id),
    content_name: items.length === 1 ? items[0]!.item_name : undefined,
    contents: items.map((item) => ({
      id: item.item_id,
      quantity: item.quantity ?? 1,
      ...(item.price !== undefined ? { item_price: item.price } : {}),
    })),
    num_items: items.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
  };
}

function dispatch(name: string, params: Record<string, unknown>, metaPixelId?: string): void {
  const target = window as WindowWithProviders;

  target.gtag?.('event', name, params);

  // Meta and TikTok's ecommerce vocabulary differs from GA4's; map only what
  // maps cleanly onto each platform's own standard event names.
  const META_EVENTS: Record<string, string> = {
    view_item: 'ViewContent',
    add_to_cart: 'AddToCart',
    begin_checkout: 'InitiateCheckout',
    search: 'Search',
    add_to_wishlist: 'AddToWishlist',
    sign_up: 'CompleteRegistration',
  };
  const metaEvent = META_EVENTS[name];
  if (metaEvent) {
    const metaParams = toMetaCustomData(params);
    // Plain 'track' fans out to every inited pixel. Once a product page has
    // inited a second pixel (ProductMetaPixel, from custom.meta_pixel_id),
    // 'track' would send to both anyway — that's fine when they're meant to
    // both fire — but 'trackSingle' to the *global* pixel is still needed
    // explicitly once we're also sending a distinct trackSingle to the
    // product pixel, otherwise Meta dedupes by event id across pixels only
    // when they're both named. Send to each pixel by id so both always get
    // exactly one copy of the event, regardless of init order.
    const globalPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (metaPixelId && globalPixelId) {
      target.fbq?.('trackSingle', globalPixelId, metaEvent, metaParams);
      target.fbq?.('trackSingle', metaPixelId, metaEvent, metaParams);
    } else {
      target.fbq?.('track', metaEvent, metaParams);
    }
  }

  const TIKTOK_EVENTS: Record<string, string> = {
    view_item: 'ViewContent',
    add_to_cart: 'AddToCart',
    begin_checkout: 'InitiateCheckout',
    search: 'Search',
    add_to_wishlist: 'AddToWishlist',
    sign_up: 'CompleteRegistration',
  };
  const tiktokEvent = TIKTOK_EVENTS[name];
  if (tiktokEvent) target.ttq?.track(tiktokEvent, params);
}

export function track<K extends keyof AnalyticsEvents>(
  name: K,
  params: AnalyticsEvents[K],
  /** Set on PDP pages with a `custom.meta_pixel_id` metafield — see ProductMetaPixel. */
  metaPixelId?: string,
): void {
  if (typeof window === 'undefined') return;
  dispatch(name, params as Record<string, unknown>, metaPixelId);
}

/** Catalog product -> GA4 item. Keeps event shape consistent across the app. */
export function toEcommerceItem(product: {
  id: string;
  handle: string;
  title: string;
  vendor?: string;
  productType?: string;
  priceRange?: { min: number };
}, overrides: Partial<EcommerceItem> = {}): EcommerceItem {
  return {
    item_id: product.handle,
    item_name: product.title,
    item_brand: product.vendor || undefined,
    item_category: product.productType || undefined,
    price: product.priceRange?.min,
    ...overrides,
  };
}
