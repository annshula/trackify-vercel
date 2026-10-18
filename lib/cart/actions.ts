'use server';

import { z } from 'zod';
import { productRepository } from '@/lib/catalog';
import {
  CartError,
  createCheckoutCart,
  validateLines,
} from '@/services/shopify/cart-service';
import { getValidSession } from '@/lib/shopify/customer-account';
import {
  resolveEffectiveCountry,
  writeSelectedCountry,
  clearSelectedCountry,
} from '@/lib/localization/country';
import { MAX_BAG_QUANTITY } from '@/lib/cart/bag-catalog';

/**
 * Server actions behind the bag.
 *
 * The bag itself is browser-side (components/cart/cart-provider.tsx) and
 * instant; the only Shopify cart this app ever creates is the one built here
 * when the shopper presses Checkout.
 */

/** Short opaque tokens only — anything longer than Meta's own formats is dropped, never trusted into an attribute. */
const adIdentitySchema = z.object({
  fbc: z.string().min(1).max(200).optional(),
  fbp: z.string().min(1).max(200).optional(),
  externalId: z.string().min(1).max(200).optional(),
});

/** Keys mirror services/webhooks/conversions.ts's AD_IDENTITY_ATTRIBUTE_KEYS. */
function adIdentityAttributes(input: unknown): { key: string; value: string }[] {
  const parsed = adIdentitySchema.safeParse(input);
  if (!parsed.success) return [];
  const { fbc, fbp, externalId } = parsed.data;
  return [
    ...(fbc ? [{ key: '_fbc', value: fbc }] : []),
    ...(fbp ? [{ key: '_fbp', value: fbp }] : []),
    ...(externalId ? [{ key: '_external_id', value: externalId }] : []),
  ];
}

const linesSchema = z
  .array(
    z.object({
      variantId: z.string().regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/, 'Invalid variant id'),
      quantity: z.coerce.number().int().min(1).max(MAX_BAG_QUANTITY),
    }),
  )
  .min(1)
  .max(20);

export type CheckoutResult =
  | { ok: true; checkoutUrl: string }
  | {
      ok: false;
      error: string;
      /** Changes the bag should apply before the shopper tries again (quantity 0 removes the line). */
      fixes?: { variantId: string; quantity: number }[];
      /** Plain-language reasons for those changes. */
      issues?: string[];
    };

/**
 * Turns the bag into Shopify's hosted checkout.
 *
 * Trust model: the browser sends only variant ids + quantities. Each id must be
 * a purchasable variant in the synced catalog, quantities are clamped, live
 * stock is checked against Shopify, and Shopify prices the cart itself — no
 * price, discount or inventory value is ever accepted from the browser.
 *
 * When something in the bag can no longer be bought it returns the corrections
 * instead of a URL, so the shopper sees what changed before paying.
 */
export async function startCheckout(input: {
  lines: unknown;
  adIdentity?: unknown;
}): Promise<CheckoutResult> {
  const parsed = linesSchema.safeParse(input.lines);
  if (!parsed.success) return { ok: false, error: 'Your bag is empty.' };

  // Fold duplicate variants into one line.
  const merged = new Map<string, number>();
  for (const line of parsed.data) {
    merged.set(
      line.variantId,
      Math.min(MAX_BAG_QUANTITY, (merged.get(line.variantId) ?? 0) + line.quantity),
    );
  }

  // Anything the catalog no longer sells never reaches Shopify.
  const catalog = await productRepository.getAllProducts();
  const purchasable = new Set(
    catalog.flatMap((product) =>
      product.variants.filter((variant) => variant.availableForSale).map((variant) => variant.id),
    ),
  );
  const gone = [...merged.keys()].filter((id) => !purchasable.has(id));
  if (gone.length > 0) {
    const sellable = [...merged.keys()].some((id) => purchasable.has(id));
    return {
      ok: false,
      error: sellable
        ? 'Your bag changed. Review the updates, then continue.'
        : 'Everything in your bag sold out.',
      fixes: gone.map((variantId) => ({ variantId, quantity: 0 })),
      issues: ['Some items in your bag are no longer available.'],
    };
  }

  const lines = [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));

  try {
    const country = await resolveEffectiveCountry();

    // A signed-in shopper gets a pre-filled checkout and the order in their account.
    let customerAccessToken: string | null = null;
    try {
      customerAccessToken = (await getValidSession())?.accessToken ?? null;
    } catch {
      // Not fatal — they can still check out as a guest.
    }

    const create = (token: string | null) =>
      createCheckoutCart({
        lines: lines.map((line) => ({ merchandiseId: line.variantId, quantity: line.quantity })),
        country,
        attributes: adIdentityAttributes(input.adIdentity),
        customerAccessToken: token,
      });

    // The cart and the live stock check don't depend on each other, so they run together.
    const [cart, issues] = await Promise.all([
      create(customerAccessToken).catch((error) => {
        // A rejected customer token must not block the sale.
        if (customerAccessToken && error instanceof CartError) return create(null);
        throw error;
      }),
      validateLines(lines, country),
    ]);

    if (issues.length > 0) {
      const fixes = issues.map((issue) => ({
        variantId: issue.variantId,
        quantity:
          issue.reason === 'insufficient-stock' && issue.availableQuantity
            ? issue.availableQuantity
            : 0,
      }));
      const everythingGone = fixes.length === lines.length && fixes.every((fix) => fix.quantity === 0);
      return {
        ok: false,
        error: everythingGone
          ? 'Everything in your bag sold out.'
          : 'Your bag changed. Review the updates, then continue.',
        fixes,
        issues: issues.map((issue) => issue.message),
      };
    }

    const url = new URL(cart.checkoutUrl);
    if (url.protocol !== 'https:') throw new Error('Unexpected checkout URL');

    // Shopify's checkout lives on its own domain — the client navigates there
    // itself (a redirect() thrown from an action would read as a failed call).
    return { ok: true, checkoutUrl: cart.checkoutUrl };
  } catch (error) {
    console.error('[checkout] could not start:', (error as Error).message);
    return {
      ok: false,
      error:
        error instanceof CartError
          ? error.message
          : "We couldn't start checkout. Please try again.",
    };
  }
}

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, 'Invalid country code');

/**
 * Sets the shopper's chosen country/market.
 *
 * Persists the choice as a cookie (an ISO code, never a currency value — see
 * lib/localization/country.ts). Prices everywhere are fetched live from
 * Shopify for that country; nothing here converts a currency itself, and the
 * bag has no Shopify cart to update until checkout.
 */
export async function setCountry(input: { countryCode: string }): Promise<{ ok: boolean; error?: string }> {
  const parsed = countryCodeSchema.safeParse(input.countryCode);
  if (!parsed.success) return { ok: false, error: 'That country is not valid.' };
  await writeSelectedCountry(parsed.data);
  return { ok: true };
}

/** "Auto" — clears the manual country override so Shopify's own default market applies. */
export async function clearCountry(): Promise<{ ok: boolean }> {
  await clearSelectedCountry();
  return { ok: true };
}
