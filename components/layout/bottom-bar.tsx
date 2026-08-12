'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { BagIcon, GridIcon, HeartIcon, HomeIcon, UserIcon } from '@/components/ui/icons';
import { useCart } from '@/components/cart/cart-provider';

/**
 * Mobile bottom navigation.
 *
 * Five destinations maximum, thumb-height, safe-area aware. Hidden from lg up,
 * where the header already carries the same destinations.
 */
export function BottomBar() {
  const pathname = usePathname();
  const { itemCount, open, signedIn } = useCart();

  const items = [
    { href: '/', label: 'Home', icon: HomeIcon, match: (p: string) => p === '/' },
    { href: '/collections', label: 'Shop', icon: GridIcon, match: (p: string) => p.startsWith('/collections') || p.startsWith('/products') },
    { href: '/wishlist', label: 'Saved', icon: HeartIcon, match: (p: string) => p.startsWith('/wishlist') },
    {
      href: signedIn ? '/account' : '/account/login',
      label: 'Account',
      icon: UserIcon,
      match: (p: string) => p.startsWith('/account'),
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors',
                  active ? 'text-ink' : 'text-ink-subtle',
                )}
              >
                <Icon size={21} />
                {item.label}
              </Link>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={open}
            aria-label={`Open bag, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
            className="relative flex min-h-14 w-full flex-col items-center justify-center gap-1 text-2xs font-medium text-ink-subtle transition-colors"
          >
            <span className="relative">
              <BagIcon size={21} />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-on-accent tabular-nums">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </span>
            Bag
          </button>
        </li>
      </ul>
    </nav>
  );
}
