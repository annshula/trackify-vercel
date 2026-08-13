'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { LogoutIcon, MapPinIcon, PackageIcon, UserIcon, HomeIcon } from '@/components/ui/icons';

const LINKS = [
  { href: '/account', label: 'Overview', icon: HomeIcon, exact: true },
  { href: '/account/orders', label: 'Orders', icon: PackageIcon },
  { href: '/account/addresses', label: 'Addresses', icon: MapPinIcon },
  { href: '/account/profile', label: 'Profile', icon: UserIcon },
];

/**
 * Account navigation.
 *
 * Below lg: a compact 2-column grid of icon-badge chips — small rows, not
 * tall tiles, so all five destinations fit without feeling like oversized
 * buttons. No Sign out row here: the mobile hamburger drawer already has one
 * (components/layout/mobile-nav.tsx), and this nav only ever renders
 * alongside that drawer below lg, so a second copy would be pure duplication.
 *
 * From lg up: the traditional sticky vertical list, unchanged — there is no
 * hamburger drawer at that width, so its own Sign out row is the only one.
 */
export function AccountNav() {
  const pathname = usePathname();

  const isActive = (link: (typeof LINKS)[number]) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-24 lg:self-start">
      {/* Compact chip grid — lg:hidden */}
      <ul className="grid grid-cols-2 gap-2 lg:hidden">
        {LINKS.map((link) => {
          const active = isActive(link);
          const Icon = link.icon;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors',
                  active
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-line bg-surface text-ink hover:bg-surface-sunken',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full',
                    active ? 'bg-white/15' : 'bg-accent-soft text-accent',
                  )}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Sticky vertical list — hidden lg:flex */}
      <ul className="hidden gap-1 lg:flex lg:flex-col">
        {LINKS.map((link) => {
          const active = isActive(link);
          const Icon = link.icon;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-2.5 rounded-md px-3.5 text-sm font-medium whitespace-nowrap transition-colors',
                  active ? 'bg-surface-sunken text-ink' : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                )}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            </li>
          );
        })}

        <li className="mt-2 border-t border-line pt-2">
          <Link
            href="/account/logout"
            prefetch={false}
            className="flex min-h-11 items-center gap-2.5 rounded-md px-3.5 text-sm font-medium whitespace-nowrap text-ink-muted transition-colors hover:bg-surface-sunken hover:text-danger"
          >
            <LogoutIcon size={18} />
            Sign out
          </Link>
        </li>
      </ul>
    </nav>
  );
}
