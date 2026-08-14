import type { Order } from '@/types/commerce';
import { formatMoneyV2 } from '@/lib/utils/money';
import { shortDate } from '@/lib/utils/date';

export function OrderDeliveryCard({ order }: { order: Order }) {
  const showBillingAddress =
    order.billingAddress && order.billingAddress.formatted.join('|') !== order.shippingAddress?.formatted.join('|');

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <dl className="divide-y divide-line px-4 text-sm">
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
              'Not applicable'
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
                    {order.paymentInformation.processedAt && ` · ${shortDate(order.paymentInformation.processedAt)}`}
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
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3.5 first:pt-4 last:pb-4">
      <dt className="text-xs font-medium tracking-wide text-ink-subtle uppercase">{label}</dt>
      <dd className="mt-1.5 text-ink">{value}</dd>
    </div>
  );
}
