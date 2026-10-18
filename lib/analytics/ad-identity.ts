/**
 * Browser identifiers Meta's server-side Purchase event needs to match back to
 * the shopper: the Pixel's `_fbc` (ad click) and `_fbp` (browser) cookies, plus
 * a stable per-browser `external_id`.
 *
 * Shopify's hosted checkout is the only place the purchase happens, so these
 * are handed to the server at checkout (see proceedToCheckout), stored as cart
 * attributes, and read back from the order's note_attributes by the orders/paid
 * webhook (services/webhooks/conversions.ts). Without them that event carries
 * no fbc/fbp/external_id at all.
 *
 * Ported from the Belurae reference (`reference/src/lib/ad-identity.ts` and
 * CartProvider.checkout).
 */

export type AdIdentity = {
  fbc?: string;
  fbp?: string;
  externalId?: string;
};

const EXTERNAL_ID_KEY = 'trackify.external_id.v1';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  if (!match) return undefined;
  const value = match.slice(name.length + 1);
  try {
    return decodeURIComponent(value) || undefined;
  } catch {
    return value || undefined;
  }
}

/**
 * A random UUID, generated once and kept in localStorage. Not tied to an
 * account (checkout is not login-gated) and not PII, so Meta accepts it
 * unhashed — its job is linking one browser's ViewContent → AddToCart →
 * Purchase into a single match.
 */
function getExternalId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const existing = window.localStorage.getItem(EXTERNAL_ID_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(EXTERNAL_ID_KEY, fresh);
    return fresh;
  } catch {
    // Private browsing / storage blocked — degrade to no external_id rather
    // than crash checkout over an analytics nicety.
    return undefined;
  }
}

/** Current browser's identifiers; each field is omitted when unavailable. */
export function readAdIdentity(): AdIdentity {
  const fbc = readCookie('_fbc');
  const fbp = readCookie('_fbp');
  const externalId = getExternalId();
  return {
    ...(fbc ? { fbc } : {}),
    ...(fbp ? { fbp } : {}),
    ...(externalId ? { externalId } : {}),
  };
}
