import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { isCustomerAccountConfigured } from '@/lib/shopify/customer-account';
import { isSignedIn } from '@/lib/auth/guard';
import { noIndex } from '@/lib/seo/metadata';

import { ButtonLink } from '@/components/ui/button';
import { Alert, EmptyState } from '@/components/ui/primitives';
import { AlertIcon, ShieldIcon, UserIcon } from '@/components/ui/icons';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: noIndex,
};

export const dynamic = 'force-dynamic';

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: 'Sign-in was cancelled. You can try again whenever you are ready.',
  expired: 'That sign-in link expired. Please start again.',
  state_mismatch: 'We could not verify that sign-in request. Please start again from this page.',
  nonce_mismatch: 'We could not verify that sign-in request. Please start again from this page.',
  exchange_failed: 'We could not complete the sign-in. Please try again in a moment.',
  missing_code: 'The sign-in response was incomplete. Please try again.',
  provider: 'We could not complete the sign-in. Please try again in a moment.',
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;

  if (await isSignedIn()) redirect('/account');

  if (!isCustomerAccountConfigured()) {
    return (
      <div className="container-page">
        <EmptyState
          icon={<UserIcon size={24} />}
          title="Accounts are not connected yet"
          description="Sign-in is not available on this store yet. You can still browse and check out as normal."
          action={<ButtonLink href="/collections">Continue shopping</ButtonLink>}
        />
      </div>
    );
  }

  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const errorMessage = rawError ? (ERROR_MESSAGES[rawError] ?? ERROR_MESSAGES.provider) : null;

  const rawReturnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//') ? rawReturnTo : '/account';

  const authorizeHref = `/account/authorize?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="container-page">
      <div className="mx-auto max-w-md py-14 sm:py-20">
        <div className="text-center">
          <span className="mx-auto mb-6 grid size-14 place-items-center rounded-full bg-surface-sunken text-ink-muted">
            <UserIcon size={26} />
          </span>
          <h1 className="text-3xl">Sign in</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            See your orders, track deliveries and manage your addresses. No password is stored by
            this site.
          </p>
        </div>

        {errorMessage && (
          <Alert tone="danger" icon={<AlertIcon size={18} />} className="mt-6">
            {errorMessage}
          </Alert>
        )}

        <div className="mt-8">
          {/* A plain link, not a form: this starts a redirect flow, not a mutation. */}
          <ButtonLink href={authorizeHref} size="lg" fullWidth prefetch={false}>
            Continue securely
          </ButtonLink>
        </div>

        <div className="mt-8 flex gap-3 rounded-lg border border-line bg-surface p-4">
          <ShieldIcon size={20} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed text-ink-muted">
            Sign-in uses a secure, encrypted flow handled by our payment and accounts provider.
            Your credentials never reach this site.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-ink-subtle">
          By continuing you agree to our{' '}
          <Link href="/pages/terms" className="underline underline-offset-4">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/pages/privacy" className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
