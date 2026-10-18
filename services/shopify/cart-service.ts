import "server-only";
import type { Cart } from "@/types/commerce";
import { storefrontRequest } from "@/lib/shopify/storefront";
import {
  CART_CREATE_MUTATION,
  VARIANTS_AVAILABILITY_QUERY,
} from "@/lib/shopify/queries/storefront";
import { firstUserError, type GraphQLUserError } from "@/lib/shopify/errors";

/**
 * Shopify cart, used only at checkout.
 *
 * The shopper's bag lives in the browser (components/cart/cart-provider.tsx),
 * so every add, change and delete is instant. A Shopify cart is created once,
 * when they press Checkout, because that is what produces the hosted checkout
 * URL. Prices, discounts and totals are Shopify's at that moment — nothing the
 * browser holds is ever trusted for money.
 */

type RawCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  updatedAt: string;
  cost: Cart["cost"];
  discountCodes: { code: string; applicable: boolean }[];
  discountAllocations: {
    discountedAmount: { amount: string; currencyCode: string };
    code?: string | null;
    title?: string | null;
  }[];
  buyerIdentity: {
    email: string | null;
    countryCode: string | null;
    customer: { id: string } | null;
  } | null;
  lines: {
    nodes: {
      id: string;
      quantity: number;
      cost: Cart["lines"][number]["cost"];
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
      ? {
          email: raw.buyerIdentity.email,
          customerAccessToken: raw.buyerIdentity.customer?.id ?? null,
          countryCode: raw.buyerIdentity.countryCode ?? null,
        }
      : null,
    // A line whose merchandise is not a ProductVariant cannot be rendered.
    lines: (raw.lines?.nodes ?? [])
      .filter(
        (line) =>
          line.merchandise &&
          typeof line.merchandise === "object" &&
          "id" in line.merchandise,
      )
      .map((line) => ({
        id: line.id,
        quantity: line.quantity,
        cost: line.cost,
        merchandise: line.merchandise as unknown as Cart["lines"][number]["merchandise"],
      })),
  };
}

export class CartError extends Error {
  readonly code: string | null;
  constructor(message: string, code: string | null = null) {
    super(message);
    this.name = "CartError";
    this.code = code;
  }
}

/**
 * Creates the checkout cart from the bag's lines, carrying the buyer's market
 * (so Shopify prices it in their currency), the signed-in customer if any (so
 * checkout is pre-filled) and the cart attributes the orders/paid webhook
 * reads back (see services/webhooks/conversions.ts).
 */
export async function createCheckoutCart(input: {
  lines: { merchandiseId: string; quantity: number }[];
  country?: string | null;
  attributes?: { key: string; value: string }[];
  customerAccessToken?: string | null;
}): Promise<Cart> {
  const country = input.country ?? null;
  const buyerIdentity =
    country || input.customerAccessToken
      ? {
          ...(country ? { countryCode: country } : {}),
          ...(input.customerAccessToken ? { customerAccessToken: input.customerAccessToken } : {}),
        }
      : undefined;

  const data = await storefrontRequest<{ cartCreate: MutationPayload }>({
    query: CART_CREATE_MUTATION,
    variables: {
      input: {
        lines: input.lines.map((line) => ({
          merchandiseId: line.merchandiseId,
          quantity: line.quantity,
        })),
        ...(input.attributes && input.attributes.length > 0 ? { attributes: input.attributes } : {}),
        ...(buyerIdentity ? { buyerIdentity } : {}),
      },
      country,
    },
  });

  const payload = data.cartCreate;
  if (!payload) throw new CartError("Shopify returned no result for cartCreate.");
  const userError = firstUserError(payload.userErrors);
  if (userError) throw new CartError(userError, payload.userErrors[0]?.code ?? null);
  if (!payload.cart) throw new CartError("Your cart could not be created. Please try again.");
  return toCart(payload.cart);
}

export type LineIssue = {
  variantId: string;
  reason: "unavailable" | "insufficient-stock";
  message: string;
  /** The most Shopify can supply right now, when stock is merely short. */
  availableQuantity?: number;
};

/**
 * Live availability for the bag's lines, straight from Shopify.
 *
 * The local catalog is never trusted for this — it can be minutes stale, and a
 * customer reaching checkout with an unavailable line is a lost order.
 */
export async function validateLines(
  lines: { variantId: string; quantity: number }[],
  country?: string | null,
): Promise<LineIssue[]> {
  if (lines.length === 0) return [];

  const data = await storefrontRequest<{
    nodes: ({
      id: string;
      availableForSale: boolean;
      quantityAvailable: number | null;
      product: { handle: string; title: string };
    } | null)[];
  }>({
    query: VARIANTS_AVAILABILITY_QUERY,
    variables: { ids: lines.map((line) => line.variantId), country: country ?? null },
  });

  const live = new Map(
    data.nodes
      .filter((node): node is NonNullable<typeof node> => node !== null)
      .map((node) => [node.id, node]),
  );

  const issues: LineIssue[] = [];
  for (const line of lines) {
    const variant = live.get(line.variantId);
    if (!variant || !variant.availableForSale) {
      const title = variant?.product.title ?? "An item in your bag";
      issues.push({
        variantId: line.variantId,
        reason: "unavailable",
        message: `${title} is no longer available.`,
      });
      continue;
    }
    if (
      typeof variant.quantityAvailable === "number" &&
      variant.quantityAvailable > 0 &&
      variant.quantityAvailable < line.quantity
    ) {
      issues.push({
        variantId: line.variantId,
        reason: "insufficient-stock",
        message: `Only ${variant.quantityAvailable} of ${variant.product.title} left — your quantity was reduced.`,
        availableQuantity: variant.quantityAvailable,
      });
    }
  }
  return issues;
}
