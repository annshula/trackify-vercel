import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { requireCustomer } from "@/lib/auth/guard";
import { getOrder } from "@/services/shopify/customer-service";
import { noIndex } from "@/lib/seo/metadata";
import {
  fulfillmentLabel,
  financialLabel,
  statusTone,
  groupShipments,
  shipmentSteps,
} from "@/lib/account/order-status";
import { formatMoneyV2 } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

import { Badge, Breadcrumb, Alert } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { AlertIcon, CheckIcon, TruckIcon } from "@/components/ui/icons";

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

  const shipments = groupShipments(order);
  const showBillingAddress =
    order.billingAddress &&
    order.billingAddress.formatted.join("|") !== order.shippingAddress?.formatted.join("|");

  return (
    <div className="space-y-8">
      <div>
        <Breadcrumb
          items={[
            { href: "/account", label: "Account" },
            { href: "/account/orders", label: "Orders" },
            { label: order.name },
          ]}
        />
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl">Order {order.name}</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Confirmed{" "}
            <time dateTime={order.processedAt}>{shortDate(order.processedAt)}</time>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={statusTone(order.fulfillmentStatus)}>
            {fulfillmentLabel(order.fulfillmentStatus)}
          </Badge>
          {order.financialStatus && (
            <Badge tone="neutral">{financialLabel(order.financialStatus)}</Badge>
          )}
        </div>
      </header>

      {order.cancelledAt && (
        <Alert tone="danger" icon={<AlertIcon size={18} />} title="This order was cancelled">
          Cancelled on {shortDate(order.cancelledAt)}. Any payment taken will be refunded to your
          original payment method.
        </Alert>
      )}

      {/* ── Order status ─────────────────────────────────────────────── */}
      <section aria-labelledby="status-heading" className="space-y-4">
        <h2 id="status-heading" className="text-lg">
          Order status
        </h2>

        {shipments.map((group) => {
          const steps = shipmentSteps(group, order);
          const trackingLinks = (group.fulfillment?.trackingInformation ?? []).filter(
            (info) => info.url,
          );

          return (
            <section
              key={group.id}
              aria-label={group.fulfillment ? `Shipment: ${fulfillmentLabel(group.fulfillment.status)}` : "Items being prepared"}
              className="rounded-lg border border-line bg-surface p-5 sm:p-6"
            >
              <ul className="flex flex-wrap gap-3">
                {group.lineItems.map((item) => (
                  <li key={item.id} className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
                    {item.image && (
                      <Image
                        src={item.image.url}
                        alt={item.image.altText ?? item.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                    <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-medium text-canvas">
                      {item.quantity}
                    </span>
                  </li>
                ))}
              </ul>

              <ol className="mt-5 space-y-0">
                {steps.map((step, index) => {
                  const isLast = index === steps.length - 1;
                  return (
                    <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className="absolute top-6 bottom-0 left-2.5 w-px bg-line"
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className="relative z-10 grid size-5 shrink-0 place-items-center rounded-full bg-success text-white ring-4 ring-surface"
                      >
                        <CheckIcon size={12} />
                      </span>
                      <div className="min-w-0 pt-px">
                        <p className="text-sm font-medium">{step.label}</p>
                        {step.description && (
                          <p className="mt-0.5 text-sm text-ink-muted">{step.description}</p>
                        )}
                        {step.at && (
                          <time dateTime={step.at} className="mt-0.5 block text-xs text-ink-subtle">
                            {shortDate(step.at)}
                          </time>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {trackingLinks.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-line pt-4">
                  {trackingLinks.map((info) => (
                    <a
                      key={info.url ?? info.number ?? "tracking"}
                      href={info.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center gap-2.5 rounded-md bg-surface-sunken px-4 text-sm font-medium transition-colors hover:bg-line"
                    >
                      <TruckIcon size={18} className="text-accent" />
                      Track with {info.company ?? "the carrier"}
                      {info.number && <span className="text-ink-subtle">· {info.number}</span>}
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* {order.statusPageUrl && (
          <p className="text-xs text-ink-subtle">
            You can also view{" "}
            <a
              href={order.statusPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-4"
            >
              the full order status page
            </a>
            .
          </p>
        )} */}
      </section>

      {/* ── Order summary ────────────────────────────────────────────── */}
      <section
        aria-labelledby="summary-heading"
        className="rounded-lg border border-line bg-surface p-5 sm:p-6"
      >
        <h2 id="summary-heading" className="mb-4 text-lg">
          Order summary
        </h2>

        <ul className="divide-y divide-line">
          {order.lineItems.map((item) => (
            <li key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
                {item.image && (
                  <Image
                    src={item.image.url}
                    alt={item.image.altText ?? item.title}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-medium text-canvas">
                  {item.quantity}
                </span>
              </span>

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="font-medium">{item.title}</p>
                {item.variantTitle && item.variantTitle !== "Default Title" && (
                  <p className="mt-0.5 text-sm text-ink-muted">{item.variantTitle}</p>
                )}
              </div>

              <div className="shrink-0 self-center text-right">
                <p className="font-medium tabular-nums">
                  {formatMoneyV2(item.totalPrice ?? item.price)}
                </p>
                {item.quantity > 1 && item.price && (
                  <p className="mt-0.5 text-xs text-ink-subtle tabular-nums">
                    {formatMoneyV2(item.price)} each
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-sm">
          {order.subtotal && (
            <Row label={`Subtotal · ${order.lineItems.length} item${order.lineItems.length === 1 ? "" : "s"}`} value={formatMoneyV2(order.subtotal)} />
          )}
          {order.discounts.map((discount, index) => (
            <Row
              key={`${discount.label ?? "discount"}-${index}`}
              label={discount.label ?? "Discount"}
              value={
                discount.amount
                  ? `−${formatMoneyV2(discount.amount)}`
                  : discount.percentage
                    ? `−${discount.percentage}%`
                    : "—"
              }
              tone="success"
            />
          ))}
          {order.totalShipping && (
            <Row
              label="Shipping"
              value={Number.parseFloat(order.totalShipping.amount) === 0 ? "Free" : formatMoneyV2(order.totalShipping)}
            />
          )}
          {order.totalTax && Number.parseFloat(order.totalTax.amount) > 0 && (
            <Row label="Tax" value={formatMoneyV2(order.totalTax)} />
          )}

          <div className="flex items-baseline justify-between border-t border-line pt-3 text-base">
            <dt className="font-medium">Total</dt>
            <dd className="text-lg font-medium tabular-nums">
              <span className="mr-1.5 text-xs font-normal text-ink-subtle">
                {order.totalPrice.currencyCode}
              </span>
              {formatMoneyV2(order.totalPrice)}
            </dd>
          </div>

          {order.totalRefunded && Number.parseFloat(order.totalRefunded.amount) > 0 && (
            <Row label="Refunded" value={formatMoneyV2(order.totalRefunded)} tone="success" />
          )}
        </dl>
      </section>

      {/* ── Contact, shipping & payment ──────────────────────────────── */}
      <section
        aria-labelledby="details-heading"
        className="rounded-lg border border-line bg-surface p-5 sm:p-6"
      >
        <h2 id="details-heading" className="mb-1 text-lg">
          Delivery &amp; payment
        </h2>

        <dl className="divide-y divide-line text-sm">
          {order.email && <DetailRow label="Contact" value={order.email} />}

          <DetailRow
            label="Ship to"
            value={
              order.shippingAddress ? (
                <address className="not-italic">
                  {order.shippingAddress.formatted.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              ) : (
                "Not applicable"
              )
            }
          />

          {showBillingAddress && order.billingAddress && (
            <DetailRow
              label="Billing"
              value={
                <address className="not-italic">
                  {order.billingAddress.formatted.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              }
            />
          )}

          {order.shippingLine?.title && <DetailRow label="Method" value={order.shippingLine.title} />}

          {order.paymentInformation && (
            <DetailRow
              label="Payment"
              value={
                <div className="flex flex-wrap items-center gap-2">
                  {order.paymentInformation.brand && (
                    <span className="capitalize">
                      {order.paymentInformation.brand.toLowerCase()}
                      {order.paymentInformation.last4 && ` · ${order.paymentInformation.last4}`}
                    </span>
                  )}
                  {order.paymentInformation.amount && (
                    <span className="text-ink-subtle">
                      {formatMoneyV2(order.paymentInformation.amount)}
                      {order.paymentInformation.processedAt &&
                        ` · ${shortDate(order.paymentInformation.processedAt)}`}
                    </span>
                  )}
                  {order.paymentInformation.paymentCollectionUrl && (
                    <a
                      href={order.paymentInformation.paymentCollectionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink underline underline-offset-4"
                    >
                      Pay outstanding balance
                    </a>
                  )}
                </div>
              }
            />
          )}
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/account/orders" variant="outline">
          ← All orders
        </ButtonLink>
        <ButtonLink href="/pages/contact" variant="ghost">
          Need help with this order?
        </ButtonLink>
      </div>

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

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className={cn("flex justify-between", tone === "success" && "text-success")}>
      <dt className={tone ? "" : "text-ink-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-4 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr]">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
