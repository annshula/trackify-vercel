'use client';

import * as React from 'react';
import { BagContents } from './bag-contents';
import { useCart } from './cart-provider';
import { Icon } from '@/components/pdp/icon';
import { useScrollLock } from '@/lib/utils/scroll-lock';
import type { CartUpsell } from '@/lib/cart/upsell';
import type { PaymentMethod } from '@/lib/shopify/payments';
import { cn } from '@/lib/utils/cn';

/**
 * Slide-in bag on a native modal <dialog>: focus trap, Esc and an inert page
 * behind come from the platform. Focus returns to whatever opened it.
 *
 * Carries the `pdp-theme` scope itself (and the theme's font variables, passed
 * in from the root layout) because it renders outside any page that does.
 */
export function CartDrawer({
  payments,
  upsells,
  delivery,
  freeShipping,
  themeClassName,
}: {
  payments: PaymentMethod[];
  upsells: CartUpsell[];
  delivery: string | null;
  freeShipping: boolean;
  themeClassName: string;
}) {
  const { isOpen, close, itemCount } = useCart();
  const ref = React.useRef<HTMLDialogElement>(null);
  const returnFocus = React.useRef<Element | null>(null);

  // Freezes the page behind the bag while it is open. The lock is counted and
  // released by the effect's cleanup, so closing the bag (button, Esc, backdrop
  // click, a link inside it) or unmounting it can never leave the page stuck.
  useScrollLock(isOpen);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      returnFocus.current = document.activeElement;
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      className={cn(
        'pdp-theme sheet fixed inset-y-2 right-2 left-auto h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] rounded-3xl shadow-drift sm:w-115',
        themeClassName,
      )}
      aria-labelledby="bag-title"
      onClose={() => {
        close();
        (returnFocus.current as HTMLElement | null)?.focus?.();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
          <h2 id="bag-title" className="font-serif text-lg" tabIndex={-1}>
            Your bag{' '}
            {itemCount > 0 && <span className="text-ink-soft">({itemCount})</span>}
          </h2>
          <button
            type="button"
            onClick={close}
            className="grid size-9 place-items-center rounded-xl bg-sand/70 hover:bg-sand"
            aria-label="Close bag"
          >
            <Icon name="close" />
          </button>
        </div>
        {isOpen && (
          <BagContents
            onNavigate={close}
            payments={payments}
            upsells={upsells}
            delivery={delivery}
            freeShipping={freeShipping}
          />
        )}
      </div>
    </dialog>
  );
}
