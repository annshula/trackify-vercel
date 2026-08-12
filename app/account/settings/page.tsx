import type { Metadata } from 'next';
import { requireCustomer } from '@/lib/auth/guard';
import { noIndex } from '@/lib/seo/metadata';
import { ButtonLink } from '@/components/ui/button';
import { PreferenceControls } from '@/components/account/preference-controls';

export const metadata: Metadata = { title: 'Settings', robots: noIndex };
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  await requireCustomer('/account/settings');

  return (
    <div className="max-w-xl space-y-6">
      <header>
        <h1 className="text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Preferences for this device, plus links to what your account controls.
        </p>
      </header>

      <PreferenceControls />

      <section aria-labelledby="data-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="data-heading" className="text-base font-medium">
          Your data
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          This storefront keeps no copy of your account. Your profile, orders and addresses live in
          your account provider, and everything you see here is read live from it.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          For a data export or account deletion, contact us and we will action it for you.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/pages/privacy" variant="outline" size="sm">
            Privacy policy
          </ButtonLink>
          <ButtonLink href="/pages/contact" variant="ghost" size="sm">
            Contact us
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="session-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="session-heading" className="text-base font-medium">
          Session
        </h2>
        <p className="mt-2 text-sm text-ink-muted">
          Signing out clears your session everywhere.
        </p>
        <div className="mt-4">
          <ButtonLink href="/account/logout" variant="outline" prefetch={false}>
            Sign out
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
