import type { Metadata } from 'next';
import { requireCustomer } from '@/lib/auth/guard';
import { getCustomer } from '@/services/shopify/customer-service';
import { noIndex } from '@/lib/seo/metadata';
import { ProfileForm } from '@/components/account/profile-form';
import { Alert } from '@/components/ui/primitives';
import { AlertIcon, InfoIcon } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Profile', robots: noIndex };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  await requireCustomer('/account/profile');

  const customer = await getCustomer().catch(() => null);

  return (
    <div className="max-w-xl space-y-6">
      <header>
        <h1 className="text-3xl">Profile</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Your details are stored by Shopify and used for your orders.
        </p>
      </header>

      {!customer ? (
        <Alert tone="danger" icon={<AlertIcon size={18} />}>
          We could not load your profile. Please refresh, or try again shortly.
        </Alert>
      ) : (
        <>
          <ProfileForm
            firstName={customer.firstName ?? ''}
            lastName={customer.lastName ?? ''}
          />

          <section aria-labelledby="contact-heading" className="rounded-lg border border-line bg-surface p-5">
            <h2 id="contact-heading" className="text-base font-medium">
              Contact details
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Email</dt>
                <dd className="text-right">{customer.emailAddress ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Phone</dt>
                <dd className="text-right">{customer.phoneNumber ?? '—'}</dd>
              </div>
            </dl>

            <div className="mt-4 flex gap-2.5 rounded-md bg-surface-sunken p-3.5 text-sm text-ink-muted">
              <InfoIcon size={17} className="mt-0.5 shrink-0" />
              <p>
                Your email address and phone number are managed by Shopify as part of your customer
                account, and change through Shopify&apos;s own verification flow rather than here.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="marketing-heading"
            className="rounded-lg border border-line bg-surface p-5"
          >
            <h2 id="marketing-heading" className="text-base font-medium">
              Marketing preferences
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Email marketing consent is recorded by Shopify when you subscribe or when you check
              out. Use the unsubscribe link in any email to opt out at any time.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
