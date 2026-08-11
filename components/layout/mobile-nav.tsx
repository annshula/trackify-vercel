'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { Drawer } from '@/components/ui/drawer';
import { ChevronRightIcon, HeartIcon, LogoutIcon, UserIcon } from '@/components/ui/icons';
import { useCart } from '@/components/cart/cart-provider';
import { ThemeToggle } from './theme-toggle';
import type { NavLink } from './header';

/**
 * Mobile navigation.
 *
 * A bottom sheet rather than a side-slide panel — thumb-reachable, and it
 * matches the cart drawer's interaction language so the whole mobile shell
 * feels like one designed surface instead of two different UI kits stitched
 * together. Shop destinations are a bento-style tile grid (scannable at a
 * glance) rather than a nested accordion; anything not featured here is one
 * tap further via the "Shop" tile, which opens the full collection index.
 */
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
    <Drawer open={open} onClose={onClose} side="bottom" title="Menu" hideTitle description="Browse the store">
      <div className="px-5 pt-1 pb-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary font-display text-lg text-on-primary">
            T
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight">Trackify</p>
            <p className="text-xs text-ink-subtle">Considered pieces, made to last.</p>
          </div>
        </div>

        {navigation.length > 0 && (
          <>
            <p className="mb-3 text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">Shop</p>
            <ul className="mb-1 grid grid-cols-2 gap-2.5">
              {navigation.map((link, index) => (
                <li
                  key={link.href}
                  className="animate-pop-in"
                  style={{ '--i': index } as React.CSSProperties}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={cn(
                      'group relative flex h-24 flex-col justify-end rounded-xl p-3.5 transition-colors',
                      index === 0
                        ? 'bg-primary text-on-primary hover:bg-primary-hover'
                        : 'bg-surface-sunken text-ink hover:bg-line',
                    )}
                  >
                    <ChevronRightIcon
                      size={16}
                      className={cn(
                        'absolute top-3 right-3 transition-transform group-hover:translate-x-0.5',
                        index === 0 ? 'text-on-primary/60' : 'text-ink-subtle',
                      )}
                    />
                    <span className="text-sm leading-snug font-medium">{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-6 space-y-1 border-t border-line pt-5">
          <MobileNavRow
            href={signedIn ? '/account' : '/account/login'}
            icon={<UserIcon size={18} />}
            label={signedIn ? 'Your account' : 'Sign in'}
            onClick={onClose}
          />
          <MobileNavRow href="/wishlist" icon={<HeartIcon size={18} />} label="Saved items" onClick={onClose} />
          {signedIn && (
            <MobileNavRow
              href="/account/logout"
              icon={<LogoutIcon size={18} />}
              label="Sign out"
              onClick={onClose}
              muted
            />
          )}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl bg-surface-sunken px-4 py-2.5">
          <span className="text-sm text-ink-muted">Appearance</span>
          <ThemeToggle />
        </div>
      </div>
    </Drawer>
  );
}

function MobileNavRow({
  href,
  icon,
  label,
  onClick,
  muted = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex min-h-13 items-center gap-3 rounded-xl px-2.5 transition-colors hover:bg-surface-sunken',
        muted ? 'text-ink-muted' : 'text-ink',
      )}
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full',
          muted ? 'bg-surface-sunken text-ink-subtle' : 'bg-surface-sunken text-ink-muted',
        )}
      >
        {icon}
      </span>
      <span className="text-base font-medium">{label}</span>
    </Link>
  );
}
