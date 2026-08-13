import type { Order, OrderFulfillment, OrderLineItem } from '@/types/commerce';

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

export type TimelineStep = {
  id: string;
  label: string;
  description: string;
  state: 'done' | 'current' | 'upcoming' | 'skipped';
  at: string | null;
};

/**
 * Builds the visual delivery timeline from real order data.
 *
 * Steps are only marked complete when Shopify actually reports them. A cancelled
 * order collapses to its own single state rather than showing a fake progression.
 */
export function buildTimeline(order: {
  processedAt: string;
  cancelledAt: string | null;
  financialStatus: string | null;
  fulfillments: {
    status: string;
    createdAt: string;
    estimatedDeliveryAt: string | null;
    events: { status: string; happenedAt: string }[];
  }[];
}): TimelineStep[] {
  if (order.cancelledAt) {
    return [
      {
        id: 'placed',
        label: 'Order placed',
        description: 'We received your order.',
        state: 'done',
        at: order.processedAt,
      },
      {
        id: 'cancelled',
        label: 'Cancelled',
        description: 'This order was cancelled.',
        state: 'current',
        at: order.cancelledAt,
      },
    ];
  }

  const fulfillment = order.fulfillments[0] ?? null;
  const eventStatuses = new Set(
    order.fulfillments.flatMap((item) => item.events.map((event) => event.status.toUpperCase())),
  );

  const shipped = Boolean(fulfillment);
  const inTransit = eventStatuses.has('IN_TRANSIT') || eventStatuses.has('OUT_FOR_DELIVERY');
  const delivered = fulfillment?.status === 'SUCCESS' || eventStatuses.has('DELIVERED');

  const eventTime = (status: string): string | null =>
    order.fulfillments
      .flatMap((item) => item.events)
      .find((event) => event.status.toUpperCase() === status)?.happenedAt ?? null;

  const steps: TimelineStep[] = [
    {
      id: 'placed',
      label: 'Order placed',
      description: 'We received your order.',
      state: 'done',
      at: order.processedAt,
    },
    {
      id: 'processing',
      label: 'Processing',
      description: 'Your order is being prepared for dispatch.',
      state: shipped ? 'done' : 'current',
      at: null,
    },
    {
      id: 'shipped',
      label: 'Shipped',
      description: 'Your order has left our warehouse.',
      state: shipped ? (inTransit || delivered ? 'done' : 'current') : 'upcoming',
      at: fulfillment?.createdAt ?? null,
    },
    {
      id: 'transit',
      label: 'In transit',
      description: 'On its way to you with the carrier.',
      state: delivered ? 'done' : inTransit ? 'current' : 'upcoming',
      at: eventTime('IN_TRANSIT') ?? eventTime('OUT_FOR_DELIVERY'),
    },
    {
      id: 'delivered',
      label: 'Delivered',
      description: delivered
        ? 'Your order arrived.'
        : fulfillment?.estimatedDeliveryAt
          ? `Estimated ${new Date(fulfillment.estimatedDeliveryAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
            })}`
          : 'We will update this once the carrier confirms delivery.',
      state: delivered ? 'done' : 'upcoming',
      at: delivered ? (eventTime('DELIVERED') ?? null) : null,
    },
  ];

  return steps;
}
