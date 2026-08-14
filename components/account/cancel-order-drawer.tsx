'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionResult, Order } from '@/types/commerce';
import { cancelOrderAction } from '@/lib/account/order-actions';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/form';
import { Drawer } from '@/components/ui/drawer';
import { Alert } from '@/components/ui/primitives';
import { AlertIcon } from '@/components/ui/icons';

const REFUNDABLE_FINANCIAL_STATUSES = new Set(['PAID', 'PARTIALLY_PAID']);

export function CancelOrderDrawer({
  order,
  open,
  onClose,
  onCancelled,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = React.useState<'CUSTOMER' | 'OTHER'>('CUSTOMER');
  const [result, setResult] = React.useState<ActionResult | null>(null);

  const refundApplicable =
    order.financialStatus !== null && REFUNDABLE_FINANCIAL_STATUSES.has(order.financialStatus);

  const onSubmit = async (formData: FormData) => {
    setResult(null);
    const outcome = await cancelOrderAction(formData);
    setResult(outcome);
    if (outcome.ok) onCancelled();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Cancel order ${order.name}`}
      description="This cancels the whole order. Items already shipped can't be included."
    >
      <form action={onSubmit} className="space-y-5 px-5 py-5">
        {result && !result.ok && (
          <Alert tone="danger" icon={<AlertIcon size={18} />}>
            {result.error}
          </Alert>
        )}

        <input type="hidden" name="orderId" value={order.id} />

        <Select
          id="cancel-reason"
          name="reason"
          label="Reason for cancelling"
          value={reason}
          onChange={(event) => setReason(event.target.value as 'CUSTOMER' | 'OTHER')}
          options={[
            { value: 'CUSTOMER', label: 'I changed my mind' },
            { value: 'OTHER', label: 'Other' },
          ]}
        />

        {reason === 'OTHER' && (
          <Textarea id="cancel-note" name="note" label="Tell us more" required maxLength={500} />
        )}

        {refundApplicable ? (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="text-sm font-medium text-ink">Refund to</legend>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="radio"
                name="refundMethod"
                value="ORIGINAL_PAYMENT_METHOD"
                defaultChecked
                className="size-4.5 accent-ink"
              />
              Original payment method
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input type="radio" name="refundMethod" value="STORE_CREDIT" className="size-4.5 accent-ink" />
              Store credit
            </label>
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="refundMethod" value="ORIGINAL_PAYMENT_METHOD" />
            <p className="text-sm text-ink-subtle">
              No payment has been charged on this order — there is nothing to refund.
            </p>
          </>
        )}

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="restock" value="true" defaultChecked className="size-4.5 rounded-xs accent-ink" />
          Return items to inventory
        </label>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="notifyCustomer"
            value="true"
            defaultChecked
            className="size-4.5 rounded-xs accent-ink"
          />
          Email me a cancellation confirmation
        </label>

        <Alert tone="danger" icon={<AlertIcon size={18} />}>
          This can&apos;t be undone. {refundApplicable ? 'Your refund will be issued right away.' : ''}
        </Alert>

        <div className="flex gap-2.5">
          <SubmitButton />
          <Button type="button" variant="ghost" onClick={onClose}>
            Never mind
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" loading={pending}>
      Cancel this order
    </Button>
  );
}
