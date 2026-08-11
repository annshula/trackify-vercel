import 'server-only';
import type { Cart, CartLine } from '@/types/commerce';
import { storefrontRequest } from '@/lib/shopify/storefront';
import {
  CART_BUYER_IDENTITY_UPDATE_MUTATION,
  CART_CREATE_MUTATION,
  CART_DISCOUNT_CODES_UPDATE_MUTATION,
  CART_LINES_ADD_MUTATION,
  CART_LINES_REMOVE_MUTATION,
  CART_LINES_UPDATE_MUTATION,
  CART_QUERY,
  VARIANTS_AVAILABILITY_QUERY,
} from '@/lib/shopify/queries/storefront';
import { firstUserError, type GraphQLUserError } from '@/lib/shopify/errors';

/**
 * ShopifyCartService.
 *
 * A thin, typed wrapper over Shopify's cart. There is deliberately no local
 * cart persistence — Shopify owns quantities, pricing, discounts and totals.
 */

type RawCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  updatedAt: string;
  cost: Cart['cost'];
  discountCodes: { code: string; applicable: boolean }[];
  discountAllocations: {
    discountedAmount: { amount: string; currencyCode: string };
    code?: string | null;
    title?: string | null;
  }[];
  buyerIdentity: { email: string | null; customer: { id: string } | null } | null;
  lines: {
    nodes: {
      id: string;
      quantity: number;
      cost: CartLine['cost'];
      merchandise: Record<string, unknown> | null;
    }[];
  };
};

type MutationPayload = { cart: RawCart | null; userErrors: GraphQLUserError[] };

function toCart(raw: RawCart): Cart {
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    updatedAt: raw.updatedAt,
    cost: raw.cost,
    discountCodes: raw.discountCodes ?? [],
    discountAllocations: (raw.discountAllocations ?? []).map((allocation) => ({
      discountedAmount: allocation.discountedAmount,
      title: allocation.title ?? null,
      code: allocation.code ?? null,
    })),
    buyerIdentity: raw.buyerIdentity
      ? { email: raw.buyerIdentity.email, customerAccessToken: raw.buyerIdentity.customer?.id ?? null }
      : null,
    // A line whose merchandise is not a ProductVariant cannot be rendered.
    lines: (raw.lines?.nodes ?? [])
      .filter((line) => line.merchandise && typeof line.merchandise === 'object' && 'id' in line.merchandise)
      .map((line) => ({
        id: line.id,
        quantity: line.quantity,
        cost: line.cost,
        merchandise: line.merchandise as unknown as CartLine['merchandise'],
      })),
  };
}

export class CartError extends Error {
  readonly code: string | null;
  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = 'CartError';
    this.code = code;
  }
}

function unwrap(payload: MutationPayload | undefined, operation: string): Cart {
  if (!payload) throw new CartError(`Shopify returned no result for ${operation}.`);

  const userError = firstUserError(payload.userErrors);
  if (userError) throw new CartError(userError, payload.userErrors[0]?.code ?? null);

  if (!payload.cart) throw new CartError(`Your cart could not be loaded. Please refresh and try again.`);
  return toCart(payload.cart);
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const data = await storefrontRequest<{ cart: RawCart | null }>({
    query: CART_QUERY,
    variables: { id: cartId },
  });
  // Shopify expires carts after ~10 days of inactivity; null means "start over".
  return data.cart ? toCart(data.cart) : null;
}

export async function createCart(
  lines: { merchandiseId: string; quantity: number }[] = [],
  buyerEmail?: string | null,
): Promise<Cart> {
  const data = await storefrontRequest<{ cartCreate: MutationPayload }>({
    query: CART_CREATE_MUTATION,
    variables: {
      input: {
        lines: lines.map((line) => ({ merchandiseId: line.merchandiseId, quantity: line.quantity })),
        ...(buyerEmail ? { buyerIdentity: { email: buyerEmail } } : {}),
      },
    },
  });
  return unwrap(data.cartCreate, 'cartCreate');
}

export async function addLines(
  cartId: string,
  lines: { merchandiseId: string; quantity: number; attributes?: { key: string; value: string }[] }[],
): Promise<Cart> {
  const data = await storefrontRequest<{ cartLinesAdd: MutationPayload }>({
    query: CART_LINES_ADD_MUTATION,
    variables: { cartId, lines },
  });
  return unwrap(data.cartLinesAdd, 'cartLinesAdd');
}

export async function updateLines(
  cartId: string,
  lines: { id: string; quantity: number }[],
): Promise<Cart> {
  const data = await storefrontRequest<{ cartLinesUpdate: MutationPayload }>({
    query: CART_LINES_UPDATE_MUTATION,
    variables: { cartId, lines },
  });
  return unwrap(data.cartLinesUpdate, 'cartLinesUpdate');
}

export async function removeLines(cartId: string, lineIds: string[]): Promise<Cart> {
  const data = await storefrontRequest<{ cartLinesRemove: MutationPayload }>({
    query: CART_LINES_REMOVE_MUTATION,
    variables: { cartId, lineIds },
  });
  return unwrap(data.cartLinesRemove, 'cartLinesRemove');
}

export async function setDiscountCodes(cartId: string, discountCodes: string[]): Promise<Cart> {
  const data = await storefrontRequest<{ cartDiscountCodesUpdate: MutationPayload }>({
    query: CART_DISCOUNT_CODES_UPDATE_MUTATION,
    variables: { cartId, discountCodes },
  });
  return unwrap(data.cartDiscountCodesUpdate, 'cartDiscountCodesUpdate');
}

export async function setBuyerIdentity(
  cartId: string,
  buyerIdentity: { email?: string | null; customerAccessToken?: string | null },
): Promise<Cart> {
  const data = await storefrontRequest<{ cartBuyerIdentityUpdate: MutationPayload }>({
    query: CART_BUYER_IDENTITY_UPDATE_MUTATION,
    variables: { cartId, buyerIdentity },
  });
  return unwrap(data.cartBuyerIdentityUpdate, 'cartBuyerIdentityUpdate');
}

export type CartValidationIssue = {
  lineId: string;
  title: string;
  reason: 'unavailable' | 'insufficient-stock' | 'price-changed';
  message: string;
  availableQuantity?: number;
};

/**
 * Pre-checkout validation against LIVE Shopify data.
 *
 * The local catalog is never trusted for this — it can be minutes stale, and a
 * customer reaching checkout with an unavailable line is a lost order.
 */
export async function validateCart(cart: Cart): Promise<CartValidationIssue[]> {
  if (cart.lines.length === 0) return [];

  const variantIds = [...new Set(cart.lines.map((line) => line.merchandise.id))];
  const data = await storefrontRequest<{
    nodes: ({
      id: string;
      availableForSale: boolean;
      quantityAvailable: number | null;
      currentlyNotInStock: boolean;
      price: { amount: string; currencyCode: string };
    } | null)[];
  }>({ query: VARIANTS_AVAILABILITY_QUERY, variables: { ids: variantIds } });

  const live = new Map(
    data.nodes.filter((node): node is NonNullable<typeof node> => node !== null).map((node) => [node.id, node]),
  );

  const issues: CartValidationIssue[] = [];

  for (const line of cart.lines) {
    const variant = live.get(line.merchandise.id);
    const title = line.merchandise.product.title;

    if (!variant || !variant.availableForSale) {
      issues.push({
        lineId: line.id,
        title,
        reason: 'unavailable',
        message: `${title} is no longer available.`,
      });
      continue;
    }

    if (
      typeof variant.quantityAvailable === 'number' &&
      variant.quantityAvailable >= 0 &&
      variant.quantityAvailable < line.quantity
    ) {
      issues.push({
        lineId: line.id,
        title,
        reason: 'insufficient-stock',
        message:
          variant.quantityAvailable === 0
            ? `${title} just sold out.`
            : `Only ${variant.quantityAvailable} of ${title} left — your quantity was reduced.`,
        availableQuantity: variant.quantityAvailable,
      });
      continue;
    }

    const livePrice = Number.parseFloat(variant.price.amount);
    const cartPrice = Number.parseFloat(line.cost.amountPerQuantity.amount);
    if (Number.isFinite(livePrice) && Number.isFinite(cartPrice) && Math.abs(livePrice - cartPrice) > 0.005) {
      issues.push({
        lineId: line.id,
        title,
        reason: 'price-changed',
        message: `The price of ${title} changed. Your cart has been updated.`,
      });
    }
  }

  return issues;
}
