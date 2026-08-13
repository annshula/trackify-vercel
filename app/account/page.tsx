import type { Metadata } from 'next';
import Link from 'next/link';

import { requireCustomer } from '@/lib/auth/guard';
import { getCustomer, listOrders } from '@/services/shopify/customer-service';
import { noIndex } from '@/lib/seo/metadata';

import { ButtonLink } from '@/components/ui/button';
import { Alert, EmptyState } from '@/components/ui/primitives';
import { OrderCard } from '@/components/account/order-card';
import { AlertIcon, ChevronRightIcon, MapPinIcon, PackageIcon, UserIcon } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Your account', robots: noIndex };
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  await requireCustomer('/account');

  // A failure in one panel should not blank the whole dashboard.
  const [customerResult, ordersResult] = await Promise.allSettled([getCustomer(), listOrders({ first: 3 })]);

  const customer = customerResult.status === 'fulfilled' ? customerResult.value : null;
  const orders = ordersResult.status === 'fulfilled' ? ordersResult.value.orders : [];
  const failed = customerResult.status === 'rejected' || ordersResult.status === 'rejected';

  const firstName = customer?.firstName?.trim();
  const greeting = firstName ? `Hello, ${firstName}` : 'Your account';
  const recentOrder = orders[0];
  const defaultAddress = customer?.addresses.find((address) => address.id === customer.defaultAddressId);
  const initials = accountInitials(customer);

  return (
    <div className="space-y-10">
      {/* Mobile-only avatar card. lg keeps the original plain header
          unchanged below — this redesign was scoped to mobile only. */}
      <header className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 lg:hidden">
        <span
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-semibold text-accent"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl">{greeting}</h1>
          {customer?.emailAddress && (
            <p className="mt-0.5 truncate text-sm text-ink-muted">{customer.emailAddress}</p>
          )}
        </div>
      </header>

      <header className="hidden lg:block">
        <h1 className="text-3xl">{greeting}</h1>
        {customer?.emailAddress && (
          <p className="mt-1.5 text-sm text-ink-muted">{customer.emailAddress}</p>
        )}
      </header>

      {failed && (
        <Alert tone="warning" icon={<AlertIcon size={18} />} title="Some details could not load">
          We could not load everything. Refresh the page, or try again shortly.
        </Alert>
      )}

      {recentOrder ? (
        <section aria-labelledby="recent-order-heading">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="recent-order-heading" className="text-xl">
              Latest order
            </h2>
            <Link
              href="/account/orders"
              className="group inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
            >
              All orders
              <ChevronRightIcon size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <OrderCard order={recentOrder} />
        </section>
      ) : (
        <EmptyState
          icon={<PackageIcon size={24} />}
          title="No orders yet"
          description="When you place an order it will appear here, with tracking as soon as it ships."
          action={<ButtonLink href="/collections">Start shopping</ButtonLink>}
          className="rounded-lg border border-line bg-surface py-12"
        />
      )}

      {orders.length > 1 && (
        <section aria-labelledby="more-orders-heading">
          <h2 id="more-orders-heading" className="mb-4 text-xl">
            Earlier orders
          </h2>
          <ul className="space-y-4">
            {orders.slice(1).map((order) => (
              <li key={order.id}>
                <OrderCard order={order} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="details-heading" className="grid gap-4 sm:grid-cols-2">
        <h2 id="details-heading" className="sr-only">
          Account details
        </h2>

        <DetailCard
          icon={<UserIcon size={20} />}
          title="Profile"
          href="/account/profile"
          actionLabel="Edit profile"
        >
          {customer ? (
            <>
              <p className="font-medium text-ink">{customer.displayName || '—'}</p>
              {customer.emailAddress && <p>{customer.emailAddress}</p>}
              {customer.phoneNumber && <p>{customer.phoneNumber}</p>}
            </>
          ) : (
            <p>Could not load your profile.</p>
          )}
        </DetailCard>

        <DetailCard
          icon={<MapPinIcon size={20} />}
          title="Default address"
          href="/account/addresses"
          actionLabel="Manage addresses"
        >
          {defaultAddress ? (
            <address className="not-italic">
              {defaultAddress.formatted.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          ) : (
            <p>No default address saved yet.</p>
          )}
        </DetailCard>
      </section>

      <section aria-labelledby="help-heading" className="rounded-lg border border-line bg-surface p-5">
        <h2 id="help-heading" className="text-base font-medium">
          Need a hand?
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Questions about an order, a return, or a delivery? We will get back to you within one
          working day.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/pages/contact" variant="outline" size="sm">
            Contact us
          </ButtonLink>
          <ButtonLink href="/pages/returns" variant="ghost" size="sm">
            Returns policy
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

/** First letter of first + last name, falling back to the display name, then a generic mark. */
function accountInitials(
  customer: { firstName: string | null; lastName: string | null; displayName: string } | null,
): string {
  if (!customer) return '·';
  const first = customer.firstName?.trim().charAt(0) ?? '';
  const last = customer.lastName?.trim().charAt(0) ?? '';
  const combined = `${first}${last}`.toUpperCase();
  if (combined) return combined;
  const fallback = customer.displayName.trim().charAt(0).toUpperCase();
  return fallback || '·';
}

function DetailCard({
  icon,
  title,
  href,
  actionLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  actionLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-line bg-surface p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="text-accent">{icon}</span>
        <h3 className="font-sans text-base font-medium tracking-normal">{title}</h3>
      </div>
      <div className="flex-1 space-y-0.5 text-sm text-ink-muted">{children}</div>
      <Link
        href={href}
        className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
      >
        {actionLabel}
        <ChevronRightIcon size={15} />
      </Link>
    </div>
  );
}
