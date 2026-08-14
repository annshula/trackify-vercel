import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireCustomer } from "@/lib/auth/guard";
import { getOrder, getOrderReturnStatus } from "@/services/shopify/customer-service";
import { getDeclinedReturnReasons } from "@/services/shopify/order-actions-service";
import { noIndex } from "@/lib/seo/metadata";
import { fulfillmentLabel, financialLabel, statusTone, groupShipments } from "@/lib/account/order-status";
import { shortDate } from "@/lib/utils/date";

import { Badge, Breadcrumb, Alert } from "@/components/ui/primitives";
import { AlertIcon } from "@/components/ui/icons";
import { OrderActions } from "@/components/account/order-actions";
import { ProductStatusCard } from "@/components/account/product-status-card";
import { OrderSummaryCard } from "@/components/account/order-summary-card";
import { OrderDeliveryCard } from "@/components/account/order-delivery-card";

export const metadata: Metadata = { title: "Order details", robots: noIndex };
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  await requireCustomer(`/account/orders/${id}`);

  const orderId = decodeURIComponent(id);
  const order = await getOrder(orderId).catch(() => null);
  if (!order) {
    notFound();
  }
  // Never allowed to fail the page — see getOrderReturnStatus's own doc comment.
  const returnStatus = await getOrderReturnStatus(orderId);
  const declineReasons = await getDeclinedReturnReasons(orderId);

  const shipments = groupShipments(order);
  const groupByItemId = new Map(shipments.flatMap((group) => group.lineItems.map((item) => [item.id, group] as const)));

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/account", label: "Account" },
          { href: "/account/orders", label: "Orders" },
          { label: order.name },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">Order {order.name}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Confirmed <time dateTime={order.processedAt}>{shortDate(order.processedAt)}</time>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={statusTone(order.fulfillmentStatus)}>{fulfillmentLabel(order.fulfillmentStatus)}</Badge>
          {order.financialStatus && <Badge tone="neutral">{financialLabel(order.financialStatus)}</Badge>}
        </div>
      </header>

      {order.cancelledAt && (
        <Alert tone="danger" icon={<AlertIcon size={18} />} title="This order was cancelled">
          Cancelled on {shortDate(order.cancelledAt)}. Any payment taken will be refunded to your original payment method.
        </Alert>
      )}

      {/* One card per product — tracking progress per product rather than
          per order avoids the exact problem an order-level stepper has:
          one delivered item would otherwise drag the whole order to
          "Delivered" even while another item is still in transit. */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Order status</h2>
        <div className="space-y-3">
          {order.lineItems.map((item) => (
            <ProductStatusCard
              key={item.id}
              item={item}
              group={groupByItemId.get(item.id)!}
              order={order}
              returnStatus={returnStatus}
              declineReasons={declineReasons}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Order summary</h2>
          <span className="text-xs text-ink-subtle">
            {order.lineItems.length} item{order.lineItems.length === 1 ? "" : "s"}
          </span>
        </div>
        <OrderSummaryCard order={order} />
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Delivery &amp; payment</h2>
        <OrderDeliveryCard order={order} />
      </div>

      <OrderActions order={order} />

      <p className="text-xs text-ink-subtle">
        Looking to return something?{" "}
        <Link href="/pages/returns" className="underline underline-offset-4">
          See the returns policy
        </Link>
        .
      </p>
    </div>
  );
}
