import 'server-only';
import { adminRequest } from '@/lib/shopify/admin';
import { CUSTOMER_CART_METAFIELD_QUERY, METAFIELDS_SET_MUTATION } from '@/lib/shopify/queries/admin';
import { firstUserError, type GraphQLUserError } from '@/lib/shopify/errors';

/**
 * Server-side session revocation.
 *
 * The session cookie is stateless (encrypted, ~30-day) and the Customer
 * Account API exposes no token-revocation endpoint, so without this a
 * captured cookie would keep authenticating after logout until it expires.
 * This stores the id of the most recently logged-out session against the
 * customer as a metafield — the same "Shopify is the source of truth"
 * pattern lib/auth/session.ts's cart link already uses — and
 * lib/auth/guard.ts's requireCustomer() checks it before trusting a session.
 *
 * Fails soft like the cart link: without read_customers/write_customers on
 * the Admin API, revocation checking is silently unavailable rather than
 * breaking sign-in or sign-out.
 */

const NAMESPACE = 'trackify';
const KEY = 'revoked_session';

let scopeDenied = false;

function isScopeDenial(message: string): boolean {
  return /access denied|access scope|ACCESS_DENIED/i.test(message);
}

function noteScopeDenial(operation: string, message: string): void {
  if (scopeDenied) return;
  scopeDenied = true;
  console.warn(
    `[session-revocation] ${operation} denied — logout no longer revokes sessions server-side. ` +
      'Grant the app read_customers and write_customers on the Admin API to enable it. ' +
      `(${message})`,
  );
}

type MetafieldResult = {
  customer: { id: string; metafield: { id: string; value: string } | null } | null;
};

type MetafieldsSetResult = {
  metafieldsSet: {
    metafields: { id: string; key: string; value: string }[] | null;
    userErrors: GraphQLUserError[];
  };
};

/** The most recently revoked session id for this customer, if any. */
export async function getRevokedSessionId(customerGid: string): Promise<string | null> {
  if (scopeDenied) return null;

  try {
    const data = await adminRequest<MetafieldResult>({
      query: CUSTOMER_CART_METAFIELD_QUERY,
      variables: { id: customerGid, namespace: NAMESPACE, key: KEY },
      retries: 1,
    });
    return data.customer?.metafield?.value ?? null;
  } catch (error) {
    const message = (error as Error).message;
    if (isScopeDenial(message)) noteScopeDenial('reading the revoked session', message);
    else console.warn('[session-revocation] could not read revoked session:', message);
    return null;
  }
}

/** Marks `sessionId` as revoked for this customer. Best-effort — logout always succeeds either way. */
export async function revokeSession(customerGid: string, sessionId: string): Promise<void> {
  if (scopeDenied) return;

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
            value: sessionId,
          },
        ],
      },
      retries: 1,
    });

    const error = firstUserError(data.metafieldsSet?.userErrors);
    if (error) {
      if (isScopeDenial(error)) noteScopeDenial('revoking the session', error);
      else console.warn('[session-revocation] could not revoke session:', error);
    }
  } catch (error) {
    const message = (error as Error).message;
    if (isScopeDenial(message)) noteScopeDenial('revoking the session', message);
    else console.warn('[session-revocation] could not revoke session:', message);
  }
}
