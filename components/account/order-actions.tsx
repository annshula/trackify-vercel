'use client';

import * as React from 'react';
import type { Order } from '@/types/commerce';
import { isCancellable, isReturnable } from '@/lib/account/order-status';
import { Button, ButtonLink } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { XCircleIcon, RefreshIcon } from '@/components/ui/icons';
import { CancelOrderDrawer } from './cancel-order-drawer';

export function OrderActions({ order }: { order: Order }) {
  const [cancelling, setCancelling] = React.useState(false);
  const { push } = useToast();

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/account/orders" variant="outline">
          ← All orders
        </ButtonLink>

        {isReturnable(order) && (
          <ButtonLink href={`/account/orders/${encodeURIComponent(order.id)}/return`} variant="outline">
            <RefreshIcon size={17} />
            Return items
          </ButtonLink>
        )}

        {isCancellable(order) && (
          <Button variant="outline" onClick={() => setCancelling(true)}>
            <XCircleIcon size={17} />
            Cancel order
          </Button>
        )}

        <ButtonLink href="/pages/contact" variant="ghost">
          Need help with this order?
        </ButtonLink>
      </div>

      <CancelOrderDrawer
        order={order}
        open={cancelling}
        onClose={() => setCancelling(false)}
        onCancelled={() => {
          setCancelling(false);
          push({ tone: 'success', message: 'Order cancelled.' });
        }}
      />
    </>
  );
}
