'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { HeartIcon } from '@/components/ui/icons';
import { useWishlist } from '@/hooks/use-wishlist';
import { useToast } from '@/components/ui/toast';
import { track } from '@/lib/analytics';

export function WishlistButton({
  handle,
  title,
  compact = false,
  className,
}: {
  handle: string;
  title: string;
  compact?: boolean;
  className?: string;
}) {
  const { has, toggle, hydrated } = useWishlist();
  const { push } = useToast();
  const saved = hydrated && has(handle);

  const onClick = (event: React.MouseEvent) => {
    // The card behind this button is a link; do not follow it.
    event.preventDefault();
    event.stopPropagation();

    const added = toggle(handle);
    if (added) track('add_to_wishlist', { items: [{ item_id: handle, item_name: title }] });
    push({
      tone: 'success',
      message: added ? `Saved ${title}` : `Removed ${title} from saved`,
      ...(added ? { action: { label: 'View', href: '/wishlist' } } : {}),
    });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={saved ? `Remove ${title} from saved items` : `Save ${title}`}
        className={cn(
          'grid size-11 place-items-center rounded-full bg-surface/85 text-ink backdrop-blur-sm transition-[background-color,color,transform] duration-200 hover:bg-surface active:scale-90',
          saved && 'text-danger',
          className,
        )}
      >
        <HeartIcon size={18} filled={saved} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-md border border-line-strong px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken',
        saved && 'border-danger/40 text-danger',
        className,
      )}
    >
      <HeartIcon size={18} filled={saved} />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
