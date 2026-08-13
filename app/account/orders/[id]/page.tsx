import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { requireCustomer } from "@/lib/auth/guard";
import { getOrder } from "@/services/shopify/customer-service";
import { noIndex } from "@/lib/seo/metadata";
import {
  buildTimeline,
  fulfillmentLabel,
  financialLabel,
  statusTone,
} from "@/lib/account/order-status";
import { formatMoneyV2 } from "@/lib/utils/money";

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

  const timeline = buildTimeline(order);
  const trackingLinks = order.fulfillments.flatMap((fulfillment) =>
    fulfillment.trackingInformation.filter((info) => info.url),
  );

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
            Placed{" "}
            <time dateTime={order.processedAt}>
              {new Date(order.processedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={statusTone(order.fulfillmentStatus)}>
            {fulfillmentLabel(order.fulfillmentStatus)}
          </Badge>
          {order.financialStatus && (
            <Badge tone="neutral">
              {financialLabel(order.financialStatus)}
            </Badge>
          )}
        </div>
      </header>

      {order.cancelledAt && (
        <Alert
          tone="danger"
          icon={<AlertIcon size={18} />}
          title="This order was cancelled"
        >
          Cancelled on{" "}
          {new Date(order.cancelledAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          . Any payment taken will be refunded to your original payment method.
        </Alert>
      )}

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <section
        aria-labelledby="timeline-heading"
        className="rounded-lg border border-line bg-surface p-5 sm:p-6"
      >
        <h2 id="timeline-heading" className="text-lg">
          Delivery
        </h2>

        <ol className="mt-5 space-y-0">
          {timeline.map((step, index) => {
            const isLast = index === timeline.length - 1;
            return (
              <li key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className={`absolute top-7 bottom-0 left-3.5 w-px ${
                      step.state === "done" ? "bg-success" : "bg-line"
                    }`}
                  />
                )}

                <span
                  aria-hidden="true"
                  className={`relative z-10 grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-surface ${
                    step.state === "done"
                      ? "bg-success text-white"
                      : step.state === "current"
                        ? "bg-accent text-on-accent"
                        : "bg-surface-sunken text-ink-subtle"
                  }`}
                >
                  {step.state === "done" ? (
                    <CheckIcon size={15} />
                  ) : (
                    <span className="size-2 rounded-full bg-current" />
                  )}
                </span>

                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-sm font-medium ${
                      step.state === "upcoming" ? "text-ink-subtle" : "text-ink"
                    }`}
                  >
                    {step.label}
                    {step.state === "current" && (
                      <span className="sr-only"> (current status)</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {step.description}
                  </p>
                  {step.at && (
                    <time
                      dateTime={step.at}
                      className="mt-0.5 block text-xs text-ink-subtle"
                    >
                      {new Date(step.at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {trackingLinks.length > 0 && (
          <div className="mt-5 space-y-2 border-t border-line pt-5">
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
                {info.number && (
                  <span className="text-ink-subtle">· {info.number}</span>
                )}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ))}
          </div>
        )}

        {order.statusPageUrl && (
          <p className="mt-4 text-xs text-ink-subtle">
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
        )}
      </section>

      {/* ── Items ────────────────────────────────────────────────────── */}
      <section aria-labelledby="items-heading">
        <h2 id="items-heading" className="mb-4 text-lg">
          Items ({order.lineItems.length})
        </h2>
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {order.lineItems.map((item) => (
            <li key={item.id} className="flex gap-4 p-4 sm:gap-5 sm:p-5">
              <span className="relative size-20 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
                {item.image && (
                  <Image
                    src={item.image.url}
                    alt={item.image.altText ?? item.title}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </span>

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="font-medium">{item.title}</p>
                {item.variantTitle && item.variantTitle !== "Default Title" && (
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {item.variantTitle}
                  </p>
                )}
                {/* {item.sku && <p className="mt-0.5 text-xs text-ink-subtle">SKU {item.sku}</p>} */}
                <p className="mt-1 text-sm text-ink-muted">
                  Quantity {item.quantity}
                </p>
              </div>

              <div className="shrink-0 text-right">
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
      </section>

      {/* ── Totals & addresses ───────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="totals-heading"
          className="rounded-lg border border-line bg-surface p-5"
        >
          <h2 id="totals-heading" className="text-lg">
            Payment
          </h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            {order.subtotal && (
              <Row label="Subtotal" value={formatMoneyV2(order.subtotal)} />
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
                value={formatMoneyV2(order.totalShipping)}
              />
            )}
            {order.totalTax && (
              <Row label="Tax" value={formatMoneyV2(order.totalTax)} />
            )}

            <div className="flex items-baseline justify-between border-t border-line pt-3 text-base">
              <dt className="font-medium">Total</dt>
              <dd className="text-lg font-medium tabular-nums">
                {formatMoneyV2(order.totalPrice)}
              </dd>
            </div>

            {order.totalRefunded &&
              Number.parseFloat(order.totalRefunded.amount) > 0 && (
                <Row
                  label="Refunded"
                  value={formatMoneyV2(order.totalRefunded)}
                  tone="success"
                />
              )}
          </dl>
        </section>

        <section
          aria-labelledby="addresses-heading"
          className="rounded-lg border border-line bg-surface p-5"
        >
          <h2 id="addresses-heading" className="text-lg">
            Addresses
          </h2>
          <div className="mt-4 grid gap-5 text-sm sm:grid-cols-2">
            <div>
              <h3 className="font-sans text-xs font-semibold tracking-[0.12em] text-ink-subtle uppercase">
                Shipping
              </h3>
              {order.shippingAddress ? (
                <address className="mt-2 space-y-0.5 not-italic text-ink-muted">
                  {order.shippingAddress.formatted.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              ) : (
                <p className="mt-2 text-ink-subtle">Not applicable</p>
              )}
            </div>

            <div>
              <h3 className="font-sans text-xs font-semibold tracking-[0.12em] text-ink-subtle uppercase">
                Billing
              </h3>
              {order.billingAddress ? (
                <address className="mt-2 space-y-0.5 not-italic text-ink-muted">
                  {order.billingAddress.formatted.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              ) : (
                <p className="mt-2 text-ink-subtle">Same as shipping</p>
              )}
            </div>
          </div>
        </section>
      </div>

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
    <div
      className={`flex justify-between ${tone === "success" ? "text-success" : ""}`}
    >
      <dt className={tone ? "" : "text-ink-muted"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
