'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Drawer } from '@/components/ui/drawer';
import { Button, ButtonLink } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/form';
import { Price } from '@/components/ui/primitives';
import { TrashIcon, TruckIcon } from '@/components/ui/icons';
import { useCart } from './cart-provider';
import { CartEmptyState } from './cart-empty-state';
import { CartSkeleton } from './cart-skeleton';
import { CartSignInPrompt } from './sign-in-prompt';
import { proceedToCheckout, removeCartLine, updateCartLine } from '@/lib/cart/actions';
import { formatMoneyV2, moneyToNumber } from '@/lib/utils/money';
import { track } from '@/lib/analytics';
import type { CartLine } from '@/types/commerce';

/** Free-shipping threshold in store currency. 0 disables the meter entirely. */
const FREE_SHIPPING_THRESHOLD = Number(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD ?? 0);

export function CartDrawer() {
  const { cart, isOpen, close, isPending, run, quantityOf, itemCount, ready, loading } =
    useCart();
  const [checkingOut, setCheckingOut] = React.useState(false);

  const lines = cart?.lines ?? [];
  const subtotal = moneyToNumber(cart?.cost.subtotalAmount);
  const currency = cart?.cost.subtotalAmount.currencyCode ?? 'USD';

  const onCheckout = async () => {
    setCheckingOut(true);
    track('begin_checkout', { currency, value: subtotal });
    // On success this redirects and never resolves.
    const result = await run(() => proceedToCheckout());
    if (!result.ok) setCheckingOut(false);
  };

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      side="right"
      title="Your bag"
      description={itemCount > 0 ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : undefined}
      footer={
        lines.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-muted">Subtotal</span>
              <span className="text-lg font-medium tabular-nums">
                {formatMoneyV2(cart?.cost.subtotalAmount)}
              </span>
            </div>
            <p className="text-xs text-ink-subtle">
              Shipping and taxes are calculated at checkout.
            </p>
            <Button
              fullWidth
              size="lg"
              onClick={onCheckout}
              loading={checkingOut}
              disabled={isPending && !checkingOut}
            >
              Checkout · {formatMoneyV2(cart?.cost.subtotalAmount)}
            </Button>
            <ButtonLink href="/cart" variant="ghost" fullWidth size="md" onClick={close}>
              View full bag
            </ButtonLink>
          </div>
        ) : null
      }
    >
      {/* Skeleton until there is something real to show: flashing "your bag
          is empty" before the response lands reads as lost items. */}
      {!ready || (loading && lines.length === 0) ? (
        <CartSkeleton />
      ) : lines.length === 0 ? (
        <CartEmptyState onNavigate={close} />
      ) : (
        <div className="flex flex-col">
          <CartSignInPrompt returnTo="/cart" onNavigate={close} />

          {FREE_SHIPPING_THRESHOLD > 0 && (
            <FreeShippingMeter subtotal={subtotal} threshold={FREE_SHIPPING_THRESHOLD} currency={currency} />
          )}

          <ul className="divide-y divide-line px-5">
            {lines.map((line) => (
              <CartDrawerLine
                key={line.id}
                line={line}
                quantity={quantityOf(line.id)}
                onClose={close}
                onQuantity={(quantity) =>
                  run(() => updateCartLine({ lineId: line.id, quantity }), {
                    optimistic: { [line.id]: quantity },
                    silent: true,
                  })
                }
                onRemove={() => {
                  track('remove_from_cart', {
                    currency,
                    value: moneyToNumber(line.cost.totalAmount),
                    items: [
                      {
                        item_id: line.merchandise.product.handle,
                        item_name: line.merchandise.product.title,
                        quantity: line.quantity,
                      },
                    ],
                  });
                  return run(() => removeCartLine({ lineId: line.id }), {
                    optimistic: { [line.id]: 0 },
                  });
                }}
              />
            ))}
          </ul>
        </div>
      )}
    </Drawer>
  );
}

function CartDrawerLine({
  line,
  quantity,
  onQuantity,
  onRemove,
  onClose,
}: {
  line: CartLine;
  quantity: number;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const { merchandise } = line;
  const options = merchandise.selectedOptions
    .filter((option) => option.value !== 'Default Title')
    .map((option) => option.value)
    .join(' · ');

  // Cap the stepper at real availability so the customer cannot exceed stock.
  const max =
    typeof merchandise.quantityAvailable === 'number' && merchandise.quantityAvailable > 0
      ? Math.min(merchandise.quantityAvailable, 99)
      : 99;

  return (
    <li className={quantity === 0 ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
      <div className="flex gap-4 py-4">
        <Link
          href={`/products/${merchandise.product.handle}`}
          onClick={onClose}
          className="relative size-20 shrink-0 overflow-hidden rounded-md bg-surface-sunken sm:size-24"
        >
          {merchandise.image ? (
            <Image
              src={merchandise.image.url}
              alt={merchandise.image.altText ?? merchandise.product.title}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : null}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/products/${merchandise.product.handle}`}
                onClick={onClose}
                className="line-clamp-2 text-sm font-medium hover:underline underline-offset-4"
              >
                {merchandise.product.title}
              </Link>
              {options && <p className="mt-0.5 text-xs text-ink-subtle">{options}</p>}
              {!merchandise.availableForSale && (
                <p className="mt-1 text-xs font-medium text-danger">No longer available</p>
              )}
            </div>

            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${merchandise.product.title} from your bag`}
              className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-sm text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-danger"
            >
              <TrashIcon size={16} />
            </button>
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <QuantityStepper
              size="sm"
              value={quantity}
              min={1}
              max={max}
              onChange={onQuantity}
              label={`Quantity of ${merchandise.product.title}`}
            />
            <Price
              amount={moneyToNumber(line.cost.totalAmount)}
              compareAt={
                line.cost.compareAtAmountPerQuantity
                  ? moneyToNumber(line.cost.compareAtAmountPerQuantity) * quantity
                  : null
              }
              currencyCode={line.cost.totalAmount.currencyCode}
              size="sm"
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function FreeShippingMeter({
  subtotal,
  threshold,
  currency,
}: {
  subtotal: number;
  threshold: number;
  currency: string;
}) {
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));
  const qualified = remaining === 0;

  return (
    <div className="border-b border-line bg-surface-sunken px-5 py-3.5">
      <p className="flex items-center gap-2 text-sm">
        <TruckIcon size={18} className={qualified ? 'text-success' : 'text-ink-muted'} />
        {qualified ? (
          <span className="font-medium text-success">Your order ships free</span>
        ) : (
          <span className="text-ink-muted">
            <span className="font-medium text-ink">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(remaining)}
            </span>{' '}
            away from free shipping
          </span>
        )}
      </p>
      <div
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress toward free shipping"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out-soft ${qualified ? 'bg-success' : 'bg-accent'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
