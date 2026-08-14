import 'server-only';
import type { CancelOrderInput, ReturnDeclineInfo } from '@/types/commerce';
import { getOrder, getOrderReturnStatus } from './customer-service';
import { adminRequest } from '@/lib/shopify/admin';
import { ORDER_CANCEL_MUTATION, RETURN_DECLINE_QUERY } from '@/lib/shopify/queries/order-actions';
import { isCancellable } from '@/lib/account/order-status';
import { firstUserError } from '@/lib/shopify/errors';

/**
 * Order/return actions and lookups that require the privileged Admin API
 * (no Customer Account API equivalent exists), triggered from a customer's
 * own action or their own order/return detail page.
 *
 * `lib/shopify/admin.ts` documents its client as never reachable from a
 * customer-facing route handler — this module is the narrow, ownership-gated
 * exception. Every function here re-verifies ownership through the
 * customer-scoped API before ever touching the Admin API with an id — for
 * `cancelOrder`, re-fetching the order; for `getDeclinedReturnReasons`,
 * re-fetching return status. Shopify itself restricts those customer-scoped
 * fetches to the signed-in customer's own data, which is the entire
 * membrane preventing a customer from acting on or reading someone else's
 * order.
 */

export class OrderActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderActionError';
  }
}

const REFUNDABLE_FINANCIAL_STATUSES = new Set(['PAID', 'PARTIALLY_PAID']);

export async function cancelOrder(input: CancelOrderInput): Promise<void> {
  // Ownership + freshness check — never trust a client-submitted order id or
  // eligibility flag on its own.
  const order = await getOrder(input.orderId);
  if (!order) {
    throw new OrderActionError('We could not find that order.');
  }
  if (!isCancellable(order)) {
    throw new OrderActionError(
      order.cancelledAt
        ? 'This order is already cancelled.'
        : 'This order has already shipped and can no longer be cancelled here. Contact us for help.',
    );
  }

  // Whether to refund at all is derived from what was actually captured —
  // never a customer-facing toggle. Only the method (below) is a real choice.
  const refund = Boolean(order.financialStatus && REFUNDABLE_FINANCIAL_STATUSES.has(order.financialStatus));

  const data = await adminRequest<{
    orderCancel: {
      job: { id: string; done: boolean } | null;
      orderCancelUserErrors: { field: string[] | null; message: string; code: string | null }[];
    };
  }>({
    query: ORDER_CANCEL_MUTATION,
    variables: {
      orderId: input.orderId,
      reason: input.reason,
      refund,
      refundMethod: refund ? input.refundMethod : null,
      restock: input.restock,
      notifyCustomer: input.notifyCustomer,
      staffNote: input.note || null,
    },
    retries: 1,
  });

  const message = firstUserError(data.orderCancel?.orderCancelUserErrors);
  if (message) throw new OrderActionError(message);
  if (!data.orderCancel) {
    throw new OrderActionError('We could not cancel this order. Please try again.');
  }
}

/**
 * Reads merchant decline reasons for an order's declined returns —
 * `Return.decline` is Admin-API-only (confirmed absent from the Customer
 * Account API). Same ownership discipline as `cancelOrder`: never touches
 * the Admin API for a return id that hasn't first been confirmed, via the
 * customer-scoped API, to belong to this order. A failure on any individual
 * return's lookup is logged and simply omitted — one bad lookup shouldn't
 * blank out the reasons for other returns on the same order, and it must
 * never break the order detail page.
 */
export async function getDeclinedReturnReasons(orderId: string): Promise<Record<string, ReturnDeclineInfo>> {
  const returnStatus = await getOrderReturnStatus(orderId);
  const declined = (returnStatus?.returns ?? []).filter((r) => r.status === 'DECLINED');
  if (declined.length === 0) return {};

  const entries = await Promise.all(
    declined.map(async (r): Promise<readonly [string, ReturnDeclineInfo | null]> => {
      try {
        const data = await adminRequest<{ return: { decline: ReturnDeclineInfo | null } | null }>({
          query: RETURN_DECLINE_QUERY,
          variables: { id: r.id },
        });
        return [r.id, data.return?.decline ?? null] as const;
      } catch (error) {
        console.error(`[return-decline] Admin lookup failed for return ${r.id}:`, error instanceof Error ? error.message : error);
        return [r.id, null] as const;
      }
    }),
  );

  const reasons: Record<string, ReturnDeclineInfo> = {};
  for (const [id, decline] of entries) {
    if (decline) reasons[id] = decline;
  }
  return reasons;
}
