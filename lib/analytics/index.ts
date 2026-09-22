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

function dispatch(name: string, params: Record<string, unknown>): void {
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
  if (metaEvent) target.fbq?.('track', metaEvent, params);

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

export function track<K extends keyof AnalyticsEvents>(name: K, params: AnalyticsEvents[K]): void {
  if (typeof window === 'undefined') return;
  dispatch(name, params as Record<string, unknown>);
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
