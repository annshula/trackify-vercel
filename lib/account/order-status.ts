import type { Order, OrderFulfillment, OrderLineItem, OrderReturnStatus } from '@/types/commerce';

/**
 * Order status presentation.
 *
 * Maps Shopify's enum values onto human labels and a visual tone. Nothing is
 * inferred beyond what Shopify reports — an order with no fulfillment shows
 * "Preparing", not an invented shipping stage.
 */

export type StatusTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'inverse';

const FULFILLMENT_LABELS: Record<string, string> = {
  SUCCESS: 'Delivered',
  IN_PROGRESS: 'On its way',
  ON_HOLD: 'On hold',
  OPEN: 'Preparing',
  PENDING_FULFILLMENT: 'Preparing',
  SCHEDULED: 'Scheduled',
  CANCELLED: 'Cancelled',
  FAILURE: 'Delivery problem',
  ERROR: 'Delivery problem',
  UNFULFILLED: 'Preparing',
};

const FULFILLMENT_TONES: Record<string, StatusTone> = {
  SUCCESS: 'success',
  IN_PROGRESS: 'accent',
  ON_HOLD: 'warning',
  SCHEDULED: 'accent',
  CANCELLED: 'danger',
  FAILURE: 'danger',
  ERROR: 'danger',
};

const FINANCIAL_LABELS: Record<string, string> = {
  PAID: 'Paid',
  PENDING: 'Payment pending',
  AUTHORIZED: 'Authorized',
  PARTIALLY_PAID: 'Partially paid',
  PARTIALLY_REFUNDED: 'Partially refunded',
  REFUNDED: 'Refunded',
  VOIDED: 'Voided',
  EXPIRED: 'Payment expired',
};

export function fulfillmentLabel(status: string | null): string {
  if (!status) return 'Preparing';
  return FULFILLMENT_LABELS[status] ?? titleCase(status);
}

export function financialLabel(status: string | null): string {
  if (!status) return 'Unknown';
  return FINANCIAL_LABELS[status] ?? titleCase(status);
}

export function statusTone(status: string | null): StatusTone {
  if (!status) return 'neutral';
  return FULFILLMENT_TONES[status] ?? 'neutral';
}

/** Pre-shipment fulfillment states — nothing has left the warehouse yet. */
const PRE_SHIPMENT_STATUSES = new Set([
  'UNFULFILLED',
  'OPEN',
  'PENDING_FULFILLMENT',
  'SCHEDULED',
]);

/**
 * Whether a customer can self-serve cancel this order: not already cancelled,
 * and nothing has shipped yet. A shipped order still may be cancellable via
 * Shopify's API, but that judgment call is left to support rather than
 * offered as a one-click self-service action.
 */
export function isCancellable(order: Pick<Order, 'cancelledAt' | 'fulfillmentStatus'>): boolean {
  if (order.cancelledAt) return false;
  return order.fulfillmentStatus === null || PRE_SHIPMENT_STATUSES.has(order.fulfillmentStatus);
}

/** Whether a customer can request a return: not cancelled, and at least one fulfillment exists. */
export function isReturnable(order: Pick<Order, 'cancelledAt' | 'fulfillments'>): boolean {
  if (order.cancelledAt) return false;
  return order.fulfillments.length > 0;
}

/**
 * Line items that have actually shipped, and so are eligible to return.
 * `OrderFulfillment.lineItemIds` only tracks membership (not a per-fulfillment
 * quantity split), so the full ordered quantity is used as the return cap —
 * the same fidelity the rest of this module already works with.
 */
export function returnableLineItems(order: Pick<Order, 'lineItems' | 'fulfillments'>): OrderLineItem[] {
  const fulfilledIds = new Set(order.fulfillments.flatMap((fulfillment) => fulfillment.lineItemIds));
  return order.lineItems.filter((item) => fulfilledIds.has(item.id));
}

const RETURN_STATUS_LABELS: Record<OrderReturnStatus, string> = {
  RETURN_REQUESTED: 'Return requested',
  IN_PROGRESS: 'Return in progress',
  INSPECTION_COMPLETE: 'Return received',
  RETURNED: 'Return complete',
  RETURN_FAILED: 'Return failed',
};

const RETURN_STATUS_DESCRIPTIONS: Record<OrderReturnStatus, string> = {
  RETURN_REQUESTED: "We're reviewing your return request.",
  IN_PROGRESS: 'Your return is on its way to us.',
  INSPECTION_COMPLETE: "We've received your return and it's being inspected.",
  RETURNED: 'Your return is complete.',
  RETURN_FAILED: 'There was a problem processing this return. Contact us for help.',
};

export function returnStatusLabel(status: OrderReturnStatus): string {
  return RETURN_STATUS_LABELS[status];
}

export function returnStatusDescription(status: OrderReturnStatus): string {
  return RETURN_STATUS_DESCRIPTIONS[status];
}

export type ShipmentGroup = {
  id: string;
  lineItems: OrderLineItem[];
  /** null means these items haven't been assigned to a shipment yet. */
  fulfillment: OrderFulfillment | null;
};

/**
 * Splits an order's line items by which shipment they're actually in —
 * Shopify fulfills a multi-item order in more than one package as often as
 * not, and each one can be at a different stage. Items not yet on any
 * fulfillment land in one trailing "still being prepared" group.
 */
export function groupShipments(order: Pick<Order, 'lineItems' | 'fulfillments'>): ShipmentGroup[] {
  const assigned = new Set<string>();

  const groups: ShipmentGroup[] = order.fulfillments.map((fulfillment) => {
    const lineItems = order.lineItems.filter((item) => fulfillment.lineItemIds.includes(item.id));
    for (const item of lineItems) assigned.add(item.id);
    return { id: fulfillment.id, lineItems, fulfillment };
  });

  const unfulfilled = order.lineItems.filter((item) => !assigned.has(item.id));
  if (unfulfilled.length > 0) {
    groups.push({ id: 'unfulfilled', lineItems: unfulfilled, fulfillment: null });
  }

  return groups;
}

export type ShipmentStep = {
  id: string;
  label: string;
  description: string | null;
  at: string | null;
};

/**
 * The compact, two-line status shown on a shipment group's own card: its
 * current stage on top (if it's shipped at all), "Confirmed" underneath —
 * mirroring how Shopify's own order-status page presents each shipment,
 * rather than the single order-wide progress bar above.
 */
export function shipmentSteps(
  group: ShipmentGroup,
  order: Pick<Order, 'processedAt'>,
): ShipmentStep[] {
  const confirmed: ShipmentStep = {
    id: 'confirmed',
    label: 'Confirmed',
    description: group.fulfillment ? null : 'We are preparing these items for shipping.',
    at: order.processedAt,
  };

  if (!group.fulfillment) return [confirmed];

  const latestEvent = group.fulfillment.events[group.fulfillment.events.length - 1] ?? null;
  const statusStep: ShipmentStep = {
    id: 'status',
    label: fulfillmentLabel(group.fulfillment.status),
    description: null,
    at: latestEvent?.happenedAt ?? group.fulfillment.createdAt,
  };

  return [statusStep, confirmed];
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

