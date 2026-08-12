'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { Cart } from '@/types/commerce';
import {
  CartError,
  addLines,
  createCart,
  getCart,
  mergeCartInto,
  removeLines,
  setBuyerIdentity,
  setDiscountCodes,
  updateLines,
  validateCart,
  type CartValidationIssue,
} from '@/services/shopify/cart-service';
import {
  getLinkedCartId,
  isCartLinkAvailable,
  setLinkedCartId,
} from '@/services/shopify/customer-cart-link';
import { getCustomer } from '@/services/shopify/customer-service';
import { clearCartId, readCartId, writeCartId } from '@/lib/auth/session';
import { getValidSession } from '@/lib/shopify/customer-account';

/**
 * Cart server actions.
 *
 * Every action validates its input, talks to Shopify, and returns a plain
 * serializable result. No cart state is stored anywhere but Shopify + the
 * cart-id cookie.
 */

export type CartActionState = {
  ok: boolean;
  cart: Cart | null;
  error?: string;
  notice?: string;
  issues?: CartValidationIssue[];
};

const variantIdSchema = z
  .string()
  .min(1)
  .regex(/^gid:\/\/shopify\/ProductVariant\/\d+$/, 'Invalid variant id');

const lineIdSchema = z.string().min(1).max(512);
const quantitySchema = z.coerce.number().int().min(0).max(999);

function failure(error: string, cart: Cart | null = null): CartActionState {
  return { ok: false, cart, error };
}

function toMessage(error: unknown): string {
  if (error instanceof CartError) return error.message;
  return 'We could not update your cart. Please try again.';
}

/** Returns the current cart, or null. Never creates one. */
export async function fetchCart(): Promise<Cart | null> {
  const cartId = await readCartId();

  // No cart in this browser: a signed-in shopper may still have one saved
  // against their account from another device.
  if (!cartId) return restoreLinkedCart();

  try {
    const cart = await getCart(cartId);
    if (!cart) {
      await clearCartId();
      return restoreLinkedCart();
    }
    return cart;
  } catch {
    // A cart lookup failure must not break page rendering.
    return null;
  }
}

/** Loads the cart saved against the signed-in customer, if there is one. */
async function restoreLinkedCart(): Promise<Cart | null> {
  // Nothing to restore without the customer scopes — skip the customer lookup.
  if (!isCartLinkAvailable()) return null;

  try {
    const session = await getValidSession();
    if (!session) return null;

    const customer = await getCustomer();
    const linkedCartId = await getLinkedCartId(customer.id);
    if (!linkedCartId) return null;

    const cart = await getCart(linkedCartId);
    if (!cart) return null;

    await writeCartId(cart.id);
    return cart;
  } catch {
    // Guests, missing customer scopes, or a transient failure — empty bag.
    return null;
  }
}

async function ensureCart(): Promise<Cart> {
  const existing = await fetchCart();
  if (existing) return existing;

  const cart = await createCart();
  await writeCartId(cart.id);

  // A brand-new cart belonging to a signed-in shopper has to be recorded
  // against the customer, or it will not follow them to another device. Only
  // creation needs this — adding lines never changes the cart id.
  await linkCartToCustomer(cart.id);

  return cart;
}

/**
 * Records `cartId` against the signed-in customer.
 *
 * Silent no-op for guests, and best-effort for everyone else: a failure here
 * costs cross-device persistence, never the sale.
 */
async function linkCartToCustomer(cartId: string): Promise<void> {
  if (!isCartLinkAvailable()) return;

  try {
    const session = await getValidSession();
    if (!session) return;

    const customer = await getCustomer();
    await setLinkedCartId(customer.id, cartId);
  } catch {
    // Missing customer scopes or a transient failure — keep the guest cart.
  }
}

/**
 * Reconciles the bag at sign-in.
 *
 * Shopify cannot look a cart up by customer, so the customer's cart id is kept
 * in a customer metafield. At sign-in there can be a bag in this browser and a
 * bag saved on the account, and discarding either would lose a shopper's items:
 *
 *  - only a guest bag      → adopt it as the account bag
 *  - only a saved bag      → restore it into this browser
 *  - both, the same        → nothing to do
 *  - both, different       → merge the guest bag into the saved one
 *
 * The saved bag wins as the merge target so the id already on the account
 * record stays stable.
 */
export async function restoreCustomerCart(): Promise<void> {
  if (!isCartLinkAvailable()) return;

  try {
    const session = await getValidSession();
    if (!session) return;

    const customer = await getCustomer();
    const [linkedCartId, guestCartId] = await Promise.all([
      getLinkedCartId(customer.id),
      readCartId(),
    ]);

    // Nothing saved yet — claim whatever this browser is holding.
    if (!linkedCartId) {
      if (guestCartId) await setLinkedCartId(customer.id, guestCartId);
      return;
    }

    // Verify the saved cart still exists; Shopify expires idle carts.
    const linkedCart = await getCart(linkedCartId);
    if (!linkedCart) {
      if (guestCartId) await setLinkedCartId(customer.id, guestCartId);
      return;
    }

    if (!guestCartId || guestCartId === linkedCartId) {
      await writeCartId(linkedCartId);
      return;
    }

    const guestCart = await getCart(guestCartId);
    if (guestCart && guestCart.lines.length > 0) {
      await mergeCartInto(guestCart, linkedCartId);
    }

    await writeCartId(linkedCartId);
  } catch (error) {
    // Never block sign-in on cart reconciliation.
    console.warn('[cart] could not restore customer cart:', (error as Error).message);
  }
}

export async function addToCart(input: {
  variantId: string;
  quantity?: number;
  productHandle?: string;
}): Promise<CartActionState> {
  const parsed = z
    .object({
      variantId: variantIdSchema,
      quantity: quantitySchema.min(1).default(1),
      productHandle: z.string().max(255).optional(),
    })
    .safeParse(input);

  if (!parsed.success) return failure('That product option is not valid.');

  try {
    const cart = await ensureCart();
    const existingLine = cart.lines.find((line) => line.merchandise.id === parsed.data.variantId);

    // Adding an item already in the cart should increase it, not duplicate it.
    const updated = existingLine
      ? await updateLines(cart.id, [
          { id: existingLine.id, quantity: existingLine.quantity + parsed.data.quantity },
        ])
      : await addLines(cart.id, [
          { merchandiseId: parsed.data.variantId, quantity: parsed.data.quantity },
        ]);

    await writeCartId(updated.id);
    revalidatePath('/cart');
    return { ok: true, cart: updated, notice: 'Added to bag' };
  } catch (error) {
    return failure(toMessage(error));
  }
}

export async function updateCartLine(input: { lineId: string; quantity: number }): Promise<CartActionState> {
  const parsed = z.object({ lineId: lineIdSchema, quantity: quantitySchema }).safeParse(input);
  if (!parsed.success) return failure('That quantity is not valid.');

  const cartId = await readCartId();
  if (!cartId) return failure('Your bag is empty.');

  try {
    const cart =
      parsed.data.quantity === 0
        ? await removeLines(cartId, [parsed.data.lineId])
        : await updateLines(cartId, [{ id: parsed.data.lineId, quantity: parsed.data.quantity }]);

    revalidatePath('/cart');
    return { ok: true, cart };
  } catch (error) {
    return failure(toMessage(error));
  }
}

export async function removeCartLine(input: { lineId: string }): Promise<CartActionState> {
  const parsed = z.object({ lineId: lineIdSchema }).safeParse(input);
  if (!parsed.success) return failure('That item is not valid.');

  const cartId = await readCartId();
  if (!cartId) return failure('Your bag is empty.');

  try {
    const cart = await removeLines(cartId, [parsed.data.lineId]);
    revalidatePath('/cart');
    return { ok: true, cart, notice: 'Removed from bag' };
  } catch (error) {
    return failure(toMessage(error));
  }
}

export async function applyDiscountCode(input: { code: string }): Promise<CartActionState> {
  const parsed = z
    .object({ code: z.string().trim().min(1, 'Enter a code').max(64) })
    .safeParse(input);
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? 'Enter a valid code.');

  const cartId = await readCartId();
  if (!cartId) return failure('Add something to your bag first.');

  try {
    const current = await getCart(cartId);
    const existing = current?.discountCodes.map((discount) => discount.code) ?? [];
    const next = [...new Set([...existing, parsed.data.code])];

    const cart = await setDiscountCodes(cartId, next);
    const applied = cart.discountCodes.find(
      (discount) => discount.code.toLowerCase() === parsed.data.code.toLowerCase(),
    );

    revalidatePath('/cart');

    // Shopify reports an unusable code by returning it with applicable: false —
    // it does not distinguish expired from invalid from unmet-minimum.
    if (!applied || !applied.applicable) {
      return {
        ok: false,
        cart,
        error: `"${parsed.data.code}" can't be applied to this order. It may have expired or not meet the requirements.`,
      };
    }

    return { ok: true, cart, notice: 'Discount applied' };
  } catch (error) {
    return failure(toMessage(error));
  }
}

export async function removeDiscountCode(input: { code: string }): Promise<CartActionState> {
  const parsed = z.object({ code: z.string().trim().min(1).max(64) }).safeParse(input);
  if (!parsed.success) return failure('That code is not valid.');

  const cartId = await readCartId();
  if (!cartId) return failure('Your bag is empty.');

  try {
    const current = await getCart(cartId);
    const remaining = (current?.discountCodes ?? [])
      .map((discount) => discount.code)
      .filter((code) => code.toLowerCase() !== parsed.data.code.toLowerCase());

    const cart = await setDiscountCodes(cartId, remaining);
    revalidatePath('/cart');
    return { ok: true, cart };
  } catch (error) {
    return failure(toMessage(error));
  }
}

/**
 * Validates against live Shopify data, self-heals what it safely can, then
 * hands off to Shopify Checkout. Payment never touches this application.
 */
export async function proceedToCheckout(): Promise<CartActionState> {
  const cartId = await readCartId();
  if (!cartId) return failure('Your bag is empty.');

  let checkoutUrl: string | null = null;

  try {
    let cart = await getCart(cartId);
    if (!cart) {
      await clearCartId();
      return failure('Your bag expired. Please add your items again.');
    }
    if (cart.lines.length === 0) return failure('Your bag is empty.');

    // Attach the signed-in customer so checkout is pre-filled and the order
    // lands in their account history.
    const session = await getValidSession();
    if (session && !cart.buyerIdentity?.customerAccessToken) {
      try {
        cart = await setBuyerIdentity(cart.id, { customerAccessToken: session.accessToken });
      } catch {
        // Not fatal — the customer can still check out as a guest.
      }
    }

    const issues = await validateCart(cart);

    if (issues.length > 0) {
      const removals = issues
        .filter((issue) => issue.reason === 'unavailable' || issue.availableQuantity === 0)
        .map((issue) => issue.lineId);

      const reductions = issues
        .filter(
          (issue): issue is CartValidationIssue & { availableQuantity: number } =>
            issue.reason === 'insufficient-stock' &&
            typeof issue.availableQuantity === 'number' &&
            issue.availableQuantity > 0,
        )
        .map((issue) => ({ id: issue.lineId, quantity: issue.availableQuantity }));

      if (removals.length > 0) cart = await removeLines(cart.id, removals);
      if (reductions.length > 0) cart = await updateLines(cart.id, reductions);

      revalidatePath('/cart');

      if (cart.lines.length === 0) {
        return { ok: false, cart, error: 'Everything in your bag sold out.', issues };
      }
      // Stop here so the customer sees what changed before paying.
      return {
        ok: false,
        cart,
        error: 'Your bag changed. Review the updates, then continue.',
        issues,
      };
    }

    checkoutUrl = cart.checkoutUrl;
  } catch (error) {
    return failure(toMessage(error));
  }

  // redirect() throws internally, so it must run outside the try/catch.
  redirect(checkoutUrl);
}

export async function associateCartWithCustomer(): Promise<void> {
  const cartId = await readCartId();
  if (!cartId) return;

  const session = await getValidSession();
  if (!session) return;

  try {
    await setBuyerIdentity(cartId, { customerAccessToken: session.accessToken });
  } catch {
    // Best-effort only — never block sign-in on this.
  }
}
