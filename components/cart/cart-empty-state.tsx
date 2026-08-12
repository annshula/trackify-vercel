'use client';

import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { BagIcon } from '@/components/ui/icons';
import { useCart } from './cart-provider';

/**
 * Empty-bag state, aware of whether the shopper is signed in.
 *
 * A signed-out shopper seeing an empty bag has two plausible situations: they
 * genuinely have not added anything, or they added items while signed in on
 * another device. The bag is keyed to a cookie on this browser, so it cannot
 * tell those apart — leading with "Sign in" answers the second case without
 * getting in the way of the first, which keeps "Start shopping" one tap away.
 */
export function CartEmptyState({
  onNavigate,
  size = 'md',
}: {
  /** Lets the cart drawer close itself before the route changes. */
  onNavigate?: () => void;
  size?: 'md' | 'lg';
}) {
  const { signedIn, ready } = useCart();
  const showSignIn = ready && !signedIn;

  return (
    <EmptyState
      icon={<BagIcon size={24} />}
      title="Your bag is empty"
      description={
        showSignIn
          ? 'Sign in to pick up a bag you started on another device, or browse to add something new.'
          : 'Everything you add will show up here.'
      }
      action={
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-center">
          {showSignIn && (
            <ButtonLink
              href="/account/login?returnTo=%2Fcart"
              size={size}
              onClick={onNavigate}
              prefetch={false}
            >
              Sign in to continue
            </ButtonLink>
          )}
          <ButtonLink
            href="/collections"
            size={size}
            variant={showSignIn ? 'outline' : 'primary'}
            onClick={onNavigate}
          >
            Start shopping
          </ButtonLink>
        </div>
      }
    />
  );
}
