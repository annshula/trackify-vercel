'use client';

import * as React from 'react';
import Link from 'next/link';
import { Drawer } from '@/components/ui/drawer';
import { ChevronDownIcon, HeartIcon, LogoutIcon, UserIcon } from '@/components/ui/icons';
import { useCart } from '@/components/cart/cart-provider';
import { ThemeToggle } from './theme-toggle';
import type { NavLink } from './header';

export function MobileNav({
  open,
  onClose,
  navigation,
}: {
  open: boolean;
  onClose: () => void;
  navigation: NavLink[];
}) {
  const { signedIn } = useCart();

  return (
    <Drawer open={open} onClose={onClose} side="left" title="Menu" hideTitle>
      <nav aria-label="Mobile" className="px-2 py-2">
        <ul className="space-y-0.5">
          {navigation.map((link) =>
            link.children && link.children.length > 0 ? (
              <li key={link.href}>
                <details className="group">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-md px-3 text-base font-medium transition-colors hover:bg-surface-sunken [&::-webkit-details-marker]:hidden">
                    {link.label}
                    <ChevronDownIcon
                      size={18}
                      className="text-ink-subtle transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <ul className="mb-1 ml-3 space-y-0.5 border-l border-line pl-3">
                    <li>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
                      >
                        All {link.label.toLowerCase()}
                      </Link>
                    </li>
                    {link.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          onClick={onClose}
                          className="flex min-h-11 items-center rounded-md px-3 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ) : (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="flex min-h-12 items-center rounded-md px-3 text-base font-medium transition-colors hover:bg-surface-sunken"
                >
                  {link.label}
                </Link>
              </li>
            ),
          )}
        </ul>

        <hr className="my-3 border-line" />

        <ul className="space-y-0.5">
          <li>
            <Link
              href={signedIn ? '/account' : '/account/login'}
              onClick={onClose}
              className="flex min-h-12 items-center gap-3 rounded-md px-3 text-base transition-colors hover:bg-surface-sunken"
            >
              <UserIcon size={20} className="text-ink-muted" />
              {signedIn ? 'Your account' : 'Sign in'}
            </Link>
          </li>
          <li>
            <Link
              href="/wishlist"
              onClick={onClose}
              className="flex min-h-12 items-center gap-3 rounded-md px-3 text-base transition-colors hover:bg-surface-sunken"
            >
              <HeartIcon size={20} className="text-ink-muted" />
              Saved items
            </Link>
          </li>
          {signedIn && (
            <li>
              <Link
                href="/account/logout"
                onClick={onClose}
                className="flex min-h-12 items-center gap-3 rounded-md px-3 text-base text-ink-muted transition-colors hover:bg-surface-sunken"
              >
                <LogoutIcon size={20} />
                Sign out
              </Link>
            </li>
          )}
        </ul>

        <hr className="my-3 border-line" />

        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-ink-muted">Appearance</span>
          <ThemeToggle />
        </div>
      </nav>
    </Drawer>
  );
}
