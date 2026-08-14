/** Admin GraphQL documents for customer-triggered order actions.
 *
 * These run through the privileged Admin API (see `services/shopify/order-actions-service.ts`
 * for the ownership check that must run before any of these are ever sent). */

export const ORDER_CANCEL_MUTATION = /* GraphQL */ `
  mutation OrderCancel(
    $orderId: ID!
    $reason: OrderCancelReason!
    $refund: Boolean!
    $refundMethod: OrderCancelRefundMethod
    $restock: Boolean!
    $notifyCustomer: Boolean
    $staffNote: String
  ) {
    orderCancel(
      orderId: $orderId
      reason: $reason
      refund: $refund
      refundMethod: $refundMethod
      restock: $restock
      notifyCustomer: $notifyCustomer
      staffNote: $staffNote
    ) {
      job {
        id
        done
      }
      orderCancelUserErrors {
        field
        message
        code
      }
    }
  }
`;
