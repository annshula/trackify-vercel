import Image from 'next/image';
import type { Order } from '@/types/commerce';
import { formatMoneyV2 } from '@/lib/utils/money';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/primitives';

export function OrderSummaryCard({ order }: { order: Order }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      <ul className="divide-y divide-line px-4">
        {order.lineItems.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 py-4 first:pt-4 last:pb-4 sm:flex-row sm:items-center sm:gap-4">
            {/* Image + title stay paired as their own row on mobile — at
                sm+ `contents` drops this wrapper so both sit in the same
                row as the price block instead. */}
            <div className="flex gap-3 sm:contents">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
                {item.image && (
                  <Image src={item.image.url} alt={item.image.altText ?? item.title} fill sizes="56px" className="object-cover" />
                )}
                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-medium text-canvas">
                  {item.quantity}
                </span>
              </span>

              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                {item.variantTitle && item.variantTitle !== 'Default Title' && (
                  <p className="mt-0.5 text-xs text-ink-muted">{item.variantTitle}</p>
                )}
                <p className="mt-1 text-sm font-medium tabular-nums sm:hidden">
                  {formatMoneyV2(item.totalPrice ?? item.price)}
                  {item.quantity > 1 && item.price && (
                    <span className="ml-1.5 text-xs font-normal text-ink-subtle">({formatMoneyV2(item.price)} each)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="hidden shrink-0 text-right sm:block">
              <p className="text-sm font-medium tabular-nums">{formatMoneyV2(item.totalPrice ?? item.price)}</p>
              {item.quantity > 1 && item.price && (
                <p className="mt-0.5 text-xs text-ink-subtle tabular-nums">{formatMoneyV2(item.price)} each</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <dl className="space-y-2.5 border-t-2 border-dashed border-line p-4 text-sm">
        {order.subtotal && <Row label="Subtotal" value={formatMoneyV2(order.subtotal)} />}
        {order.discounts.map((discount, index) => (
          <Row
            key={`${discount.label ?? 'discount'}-${index}`}
            label={discount.label ?? 'Discount'}
            value={
              discount.amount ? `−${formatMoneyV2(discount.amount)}` : discount.percentage ? `−${discount.percentage}%` : '—'
            }
            tone="success"
          />
        ))}
        {order.totalShipping && (
          <div className="flex justify-between">
            <dt className="text-ink-muted">Shipping</dt>
            <dd className="tabular-nums">
              {Number.parseFloat(order.totalShipping.amount) === 0 ? (
                <Badge tone="success">Free</Badge>
              ) : (
                formatMoneyV2(order.totalShipping)
              )}
            </dd>
          </div>
        )}
        {order.totalTax && Number.parseFloat(order.totalTax.amount) > 0 && <Row label="Tax" value={formatMoneyV2(order.totalTax)} />}

        <div className="mt-1 flex items-baseline justify-between rounded-md bg-surface-sunken px-4 py-3.5">
          <dt className="font-medium">Total</dt>
          <dd className="text-lg font-medium tabular-nums">
            <span className="mr-1.5 text-xs font-normal text-ink-subtle">{order.totalPrice.currencyCode}</span>
            {formatMoneyV2(order.totalPrice)}
          </dd>
        </div>

        {order.totalRefunded && Number.parseFloat(order.totalRefunded.amount) > 0 && (
          <Row label="Refunded" value={formatMoneyV2(order.totalRefunded)} tone="success" />
        )}
      </dl>
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className={cn('flex justify-between', tone === 'success' && 'text-success')}>
      <dt className={tone ? '' : 'text-ink-muted'}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
