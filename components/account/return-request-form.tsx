'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Order, OrderLineItem, ReturnLineItemInput, ReturnReason } from '@/types/commerce';
import { requestReturnAction } from '@/lib/account/order-actions';
import { returnReasonLabel } from '@/lib/account/order-status';
import { formatMoneyV2 } from '@/lib/utils/money';
import { Button } from '@/components/ui/button';
import { Select, QuantityStepper } from '@/components/ui/form';
import { Alert } from '@/components/ui/primitives';
import { AlertIcon } from '@/components/ui/icons';
import { useToast } from '@/components/ui/toast';

// UNKNOWN is a real enum value but not something a customer would ever pick themselves.
const SELECTABLE_REASONS: ReturnReason[] = [
  'SIZE_TOO_SMALL',
  'SIZE_TOO_LARGE',
  'DEFECTIVE',
  'NOT_AS_DESCRIBED',
  'WRONG_ITEM',
  'STYLE',
  'COLOR',
  'UNWANTED',
  'OTHER',
];
const REASON_OPTIONS: { value: ReturnReason; label: string }[] = SELECTABLE_REASONS.map((value) => ({
  value,
  label: returnReasonLabel(value),
}));

type Selection = { quantity: number; reason: ReturnReason | '' };

/**
 * Select-items/quantity/reason return request UI for a single order — pick
 * as many of its shipped products as you like, each with its own quantity
 * and reason.
 */
export function ReturnRequestForm({
  order,
  items,
  redirectTo,
}: {
  order: Order;
  items: OrderLineItem[];
  redirectTo: string;
}) {
  const router = useRouter();
  const { push: pushToast } = useToast();
  const [selections, setSelections] = React.useState<Record<string, Selection>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const setQuantity = (itemId: string, quantity: number) => {
    setSelections((current) => ({
      ...current,
      [itemId]: { quantity, reason: current[itemId]?.reason ?? '' },
    }));
  };

  const setReason = (itemId: string, reason: ReturnReason) => {
    setSelections((current) => ({
      ...current,
      [itemId]: { quantity: current[itemId]?.quantity ?? 0, reason },
    }));
  };

  const selectedCount = Object.values(selections).reduce((sum, s) => sum + (s.quantity > 0 ? s.quantity : 0), 0);

  const estimatedRefund = items.reduce((sum, item) => {
    const selection = selections[item.id];
    if (!selection || selection.quantity <= 0 || !item.price) return sum;
    return sum + Number.parseFloat(item.price.amount) * selection.quantity;
  }, 0);

  const handleSubmit = async () => {
    setError(null);

    const selectedItems: ReturnLineItemInput[] = [];
    for (const item of items) {
      const selection = selections[item.id];
      if (!selection || selection.quantity <= 0) continue;
      if (!selection.reason) {
        setError('Choose a reason for each item you want to return.');
        return;
      }
      selectedItems.push({ orderId: order.id, lineItemId: item.id, quantity: selection.quantity, reason: selection.reason });
    }

    if (selectedItems.length === 0) {
      setError('Select at least one item to return.');
      return;
    }

    setSubmitting(true);
    const outcome = await requestReturnAction(selectedItems);
    setSubmitting(false);

    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }

    pushToast({
      tone: 'success',
      message: "Return request received — we'll email you shipping instructions within 1 business day.",
    });
    router.push(redirectTo);
  };

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:pb-0">
      <div className="space-y-6">
        {error && (
          <Alert tone="danger" icon={<AlertIcon size={18} />}>
            {error}
          </Alert>
        )}

        <section className="divide-y divide-line rounded-lg border border-line bg-surface">
          {items.map((item) => {
            const selection = selections[item.id];
            const quantity = selection?.quantity ?? 0;
            return (
              <div key={item.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
                  {item.image && (
                    <Image src={item.image.url} alt={item.image.altText ?? item.title} fill sizes="64px" className="object-cover" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium">{item.title}</p>
                  {item.variantTitle && item.variantTitle !== 'Default Title' && (
                    <p className="mt-0.5 text-sm text-ink-muted">{item.variantTitle}</p>
                  )}
                  {item.price && <p className="mt-1 text-sm tabular-nums text-ink-subtle">{formatMoneyV2(item.price)} each</p>}

                  {quantity > 0 && (
                    <div className="mt-3 max-w-xs">
                      <Select
                        id={`reason-${item.id}`}
                        name={`reason-${item.id}`}
                        label="Return reason"
                        value={selection?.reason ?? ''}
                        onChange={(event) => setReason(item.id, event.target.value as ReturnReason)}
                        options={[{ value: '', label: 'Select return reason' }, ...REASON_OPTIONS]}
                      />
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                  <QuantityStepper
                    value={quantity}
                    onChange={(next) => setQuantity(item.id, next)}
                    min={0}
                    max={item.quantity}
                    label={`Quantity to return for ${item.title}`}
                    size="sm"
                  />
                  <span className="text-xs text-ink-subtle tabular-nums">/ {item.quantity}</span>
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <SummaryPanel
        selectedCount={selectedCount}
        estimatedRefund={estimatedRefund}
        currencyCode={order.totalPrice.currencyCode}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function SummaryPanel({
  selectedCount,
  estimatedRefund,
  currencyCode,
  submitting,
  onSubmit,
}: {
  selectedCount: number;
  estimatedRefund: number;
  currencyCode: string;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const refundLabel = formatMoneyV2({ amount: estimatedRefund.toFixed(2), currencyCode });

  const content = (
    <>
      <h2 className="text-xs font-medium tracking-wide text-ink-subtle uppercase">Summary</h2>
      <div className="mt-3 flex items-baseline justify-between text-sm">
        <span className="text-ink-muted">
          {selectedCount} item{selectedCount === 1 ? '' : 's'} selected
        </span>
        <span className="text-lg font-medium tabular-nums">{refundLabel}</span>
      </div>
      <p className="mt-1 text-xs text-ink-subtle">Estimated refund, before shipping instructions are confirmed.</p>
      <Button fullWidth size="lg" className="mt-4" onClick={onSubmit} loading={submitting} disabled={selectedCount === 0}>
        Request return
      </Button>
    </>
  );

  return (
    <>
      <aside className="hidden rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24 lg:block">{content}</aside>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-e3 lg:hidden">
        {content}
      </div>
    </>
  );
}
