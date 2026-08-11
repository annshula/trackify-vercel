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
 * A horizontal scroller on mobile (no space for a sidebar, and a dropdown
 * hides where you are), a vertical list from lg up.
 */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="hide-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <li key={link.href} className="shrink-0 lg:shrink">
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

        <li className="shrink-0 lg:mt-2 lg:shrink lg:border-t lg:border-line lg:pt-2">
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
