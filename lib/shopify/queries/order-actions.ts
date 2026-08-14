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

/**
 * Reads why a merchant declined a return — `Return.decline { reason, note }`
 * only exists on the Admin API (confirmed absent from the Customer Account
 * API via live introspection). Read-only, but still requires the same
 * ownership gate as the mutation above — see `getDeclinedReturnReasons` in
 * order-actions-service.ts.
 */
export const RETURN_DECLINE_QUERY = /* GraphQL */ `
  query ReturnDecline($id: ID!) {
    return(id: $id) {
      decline {
        reason
        note
      }
    }
  }
`;
