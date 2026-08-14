import 'server-only';
import type { CancelOrderInput } from '@/types/commerce';
import { getOrder } from './customer-service';
import { adminRequest } from '@/lib/shopify/admin';
import { ORDER_CANCEL_MUTATION } from '@/lib/shopify/queries/order-actions';
import { isCancellable } from '@/lib/account/order-status';
import { firstUserError } from '@/lib/shopify/errors';

/**
 * Order actions that require the privileged Admin API (`orderCancel` has no
 * Customer Account API equivalent), triggered from a customer's own action.
 *
 * `lib/shopify/admin.ts` documents its client as never reachable from a
 * customer-facing route handler — this is the one narrow, ownership-gated
 * exception. `cancelOrder` never touches the Admin API with an order id that
 * hasn't first been re-fetched through the customer-scoped API, which
 * Shopify itself restricts to the signed-in customer's own orders. That
 * re-fetch is the entire membrane preventing a customer from cancelling
 * someone else's order.
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
