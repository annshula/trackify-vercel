import 'server-only';
import { adminRequest } from '@/lib/shopify/admin';
import {
  CUSTOMER_CART_METAFIELD_QUERY,
  METAFIELDS_SET_MUTATION,
} from '@/lib/shopify/queries/admin';
import { firstUserError, type GraphQLUserError } from '@/lib/shopify/errors';

/**
 * Customer ↔ cart persistence.
 *
 * Shopify's Cart API can only fetch a cart by its ID; there is no
 * "customer's cart" query, and attaching `buyerIdentity.customerAccessToken`
 * authenticates the cart at checkout without making it retrievable later. So
 * restoring a signed-in shopper's bag on a new device requires storing the
 * customer → cart-id mapping ourselves.
 *
 * A customer metafield is the Shopify-native place for that: the mapping lives
 * with the customer record rather than in a parallel database, which keeps the
 * "Shopify is the source of truth" rule intact.
 *
 * NOTE ON SCOPES: this is the only part of the app that touches customer
 * records, and it needs `read_customers` + `write_customers` on the Admin API —
 * protected customer data. Every function here fails soft: if the scope is
 * missing the app falls back to the cookie-scoped guest cart rather than
 * breaking sign-in or checkout.
 */

const NAMESPACE = 'trackify';
const KEY = 'cart_id';

/**
 * Missing customer scopes are a configuration state, not a transient failure:
 * every call will fail identically until the app is reconfigured. Retrying on
 * each request adds a doomed round trip to the critical path of every cart
 * read, so the first denial disables the feature for this process and says so
 * exactly once.
 */
let scopeDenied = false;

function isScopeDenial(message: string): boolean {
  return /access denied|access scope|ACCESS_DENIED/i.test(message);
}

/**
 * False once the app is known to lack the customer scopes.
 *
 * Callers check this *before* doing the work that only exists to feed this
 * feature — resolving the customer costs a Customer Account API round trip,
 * and paying for it to then discard the result would put an avoidable call on
 * the critical path of every cart read.
 */
export function isCartLinkAvailable(): boolean {
  return !scopeDenied;
}

function noteScopeDenial(operation: string, message: string): void {
  if (scopeDenied) return;
  scopeDenied = true;
  console.warn(
    `[cart-link] ${operation} denied — cross-device cart sync is off. ` +
      'Grant the app read_customers and write_customers on the Admin API to enable it. ' +
      `Carts still work per-browser. (${message})`,
  );
}

/** Shopify cart GIDs look like gid://shopify/Cart/<token>. */
const CART_GID = /^gid:\/\/shopify\/Cart\/[A-Za-z0-9_-]+$/;

type MetafieldResult = {
  customer: { id: string; metafield: { id: string; value: string } | null } | null;
};

type MetafieldsSetResult = {
  metafieldsSet: {
    metafields: { id: string; key: string; value: string }[] | null;
    userErrors: GraphQLUserError[];
  };
};

/** The cart id previously saved against this customer, if any. */
export async function getLinkedCartId(customerGid: string): Promise<string | null> {
  if (scopeDenied) return null;

  try {
    const data = await adminRequest<MetafieldResult>({
      query: CUSTOMER_CART_METAFIELD_QUERY,
      variables: { id: customerGid, namespace: NAMESPACE, key: KEY },
      retries: 1,
    });

    const value = data.customer?.metafield?.value ?? null;
    // Guard against a hand-edited or stale metafield value.
    return value && CART_GID.test(value) ? value : null;
  } catch (error) {
    const message = (error as Error).message;
    if (isScopeDenial(message)) noteScopeDenial('reading the linked cart', message);
    else console.warn('[cart-link] could not read linked cart:', message);
    return null;
  }
}

/** Points this customer at `cartId`. Best-effort — never blocks a cart action. */
export async function setLinkedCartId(customerGid: string, cartId: string): Promise<void> {
  if (scopeDenied || !CART_GID.test(cartId)) return;

  try {
    const data = await adminRequest<MetafieldsSetResult>({
      query: METAFIELDS_SET_MUTATION,
      variables: {
        metafields: [
          {
            ownerId: customerGid,
            namespace: NAMESPACE,
            key: KEY,
            type: 'single_line_text_field',
            value: cartId,
          },
        ],
      },
      retries: 1,
    });

    const error = firstUserError(data.metafieldsSet?.userErrors);
    if (error) {
      if (isScopeDenial(error)) noteScopeDenial('saving the linked cart', error);
      else console.warn('[cart-link] could not save linked cart:', error);
    }
  } catch (error) {
    const message = (error as Error).message;
    if (isScopeDenial(message)) noteScopeDenial('saving the linked cart', message);
    else console.warn('[cart-link] could not save linked cart:', message);
  }
}
