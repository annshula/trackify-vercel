'use client';

/**
 * Analytics abstraction.
 *
 * One `track()` call fans out to whichever providers are configured. Nothing
 * loads and nothing fires until the visitor has granted consent, and no
 * personally identifying data is ever put into an event payload.
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

export type ConsentState = { analytics: boolean; marketing: boolean };

const CONSENT_KEY = 'tf_consent';

export function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return { analytics: Boolean(parsed.analytics), marketing: Boolean(parsed.marketing) };
  } catch {
    return null;
  }
}

export function writeConsent(state: ConsentState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  } catch {
    // Private mode / storage disabled — treat as no consent rather than crashing.
  }
  window.dispatchEvent(new CustomEvent('tf:consent', { detail: state }));
}

type WindowWithProviders = Window & {
  gtag?: (...args: unknown[]) => void;
  fbq?: (...args: unknown[]) => void;
};

/** Events fired before consent resolves are held here, not dropped. */
const queue: { name: keyof AnalyticsEvents; params: Record<string, unknown> }[] = [];
const MAX_QUEUE = 30;

function dispatch(name: string, params: Record<string, unknown>): void {
  const target = window as WindowWithProviders;

  target.gtag?.('event', name, params);

  // Meta's ecommerce vocabulary differs from GA4's; map only what maps cleanly.
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
}

export function track<K extends keyof AnalyticsEvents>(name: K, params: AnalyticsEvents[K]): void {
  if (typeof window === 'undefined') return;

  const consent = readConsent();
  if (!consent?.analytics) {
    if (queue.length < MAX_QUEUE) queue.push({ name, params: params as Record<string, unknown> });
    return;
  }

  flushQueue();
  dispatch(name, params as Record<string, unknown>);
}

export function flushQueue(): void {
  const consent = readConsent();
  if (!consent?.analytics) return;
  while (queue.length > 0) {
    const event = queue.shift();
    if (event) dispatch(event.name, event.params);
  }
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
