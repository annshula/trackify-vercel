import Image from 'next/image';
import Link from 'next/link';
import type { OrderSummary } from '@/types/commerce';
import { Badge } from '@/components/ui/primitives';
import { ChevronRightIcon } from '@/components/ui/icons';
import { formatMoneyV2 } from '@/lib/utils/money';
import { fulfillmentLabel, financialLabel, statusTone } from '@/lib/account/order-status';

export function OrderCard({ order, compact = false }: { order: OrderSummary; compact?: boolean }) {
  const orderId = encodeURIComponent(order.id);
  const placed = new Date(order.processedAt);

  return (
    <article className="group relative rounded-lg border border-line bg-surface transition-colors hover:border-line-strong">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="font-sans text-base font-medium tracking-normal">
            <Link href={`/account/orders/${orderId}`} className="hover:underline underline-offset-4">
              <span className="absolute inset-0" aria-hidden="true" />
              Order {order.name}
            </Link>
          </h3>
          <p className="mt-0.5 text-xs text-ink-subtle">
            <time dateTime={order.processedAt}>
              {placed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            {' · '}
            {order.lineItemCount} item{order.lineItemCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={statusTone(order.fulfillmentStatus)}>{fulfillmentLabel(order.fulfillmentStatus)}</Badge>
          {order.financialStatus && order.financialStatus !== 'PAID' && (
            <Badge tone="warning">{financialLabel(order.financialStatus)}</Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-4">
        {!compact && order.previewImages.length > 0 && (
          <ul className="flex gap-2">
            {order.previewImages.map((image, index) => (
              <li
                key={`${image.url}-${index}`}
                className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-sunken"
              >
                <Image
                  src={image.url}
                  alt={image.altText ?? ''}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </li>
            ))}
            {order.lineItemCount > order.previewImages.length && (
              <li className="relative grid size-14 shrink-0 place-items-center rounded-md bg-surface-sunken text-xs font-medium text-ink-muted">
                +{order.lineItemCount - order.previewImages.length}
              </li>
            )}
          </ul>
        )}

        <div className="ml-auto flex items-center gap-4">
          <p className="text-right">
            <span className="block text-xs text-ink-subtle">Total</span>
            <span className="text-base font-medium tabular-nums">{formatMoneyV2(order.totalPrice)}</span>
          </p>
          <ChevronRightIcon
            size={18}
            className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
          />
        </div>
      </div>
    </article>
  );
}
