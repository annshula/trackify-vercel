'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { UserIcon } from '@/components/ui/icons';
import { useCart } from './cart-provider';

/**
 * Invites a signed-out shopper to sign in from the bag.
 *
 * Deliberately a prompt, not a gate. Requiring an account before a shopper can
 * see their bag or reach checkout is one of the most reliable ways to lose the
 * sale — guest checkout stays fully available, and this simply makes the
 * benefit of an account visible at the moment it is most relevant.
 *
 * Renders nothing until the session has actually resolved, so it never flashes
 * at a customer who is already signed in.
 */
export function CartSignInPrompt({
  returnTo,
  onNavigate,
  className,
}: {
  /** Where to send the shopper back to after signing in. */
  returnTo: string;
  /** Lets the cart drawer close itself before the route changes. */
  onNavigate?: () => void;
  className?: string;
}) {
  const { signedIn, ready } = useCart();

  if (!ready || signedIn) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-line bg-surface-sunken px-5 py-3',
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink-muted">
        <UserIcon size={17} />
      </span>

      <p className="min-w-0 flex-1 text-sm text-ink-muted">
        <Link
          href={`/account/login?returnTo=${encodeURIComponent(returnTo)}`}
          onClick={onNavigate}
          prefetch={false}
          className="font-medium text-ink underline underline-offset-4"
        >
          Sign in
        </Link>{' '}
        to save your bag and track this order.
      </p>
    </div>
  );
}
