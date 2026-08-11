import type { ReactNode } from 'react';
import { AccountNav } from '@/components/account/account-nav';
import { isSignedIn } from '@/lib/auth/guard';

/**
 * Account shell.
 *
 * The nav renders only for signed-in customers so the login and callback
 * routes stay a clean, single-purpose screen.
 */
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const signedIn = await isSignedIn();

  if (!signedIn) return <>{children}</>;

  return (
    <div className="container-page">
      <div className="grid gap-8 py-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:py-10">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
