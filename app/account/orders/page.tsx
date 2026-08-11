import type { Metadata } from 'next';
import { requireCustomer } from '@/lib/auth/guard';
import { listOrders } from '@/services/shopify/customer-service';
import { noIndex } from '@/lib/seo/metadata';

import { ButtonLink } from '@/components/ui/button';
import { Alert, EmptyState } from '@/components/ui/primitives';
import { OrderCard } from '@/components/account/order-card';
import { AlertIcon, PackageIcon } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Orders', robots: noIndex };
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: PageProps) {
  await requireCustomer('/account/orders');

  const params = await searchParams;
  const rawCursor = Array.isArray(params.after) ? params.after[0] : params.after;

  let result: Awaited<ReturnType<typeof listOrders>> | null = null;
  let error: string | null = null;

  try {
    result = await listOrders({ first: 10, after: rawCursor ?? null });
  } catch {
    error = 'We could not load your orders. Please refresh, or try again shortly.';
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Orders</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Every order you have placed, with tracking as soon as it ships.
        </p>
      </header>

      {error && (
        <Alert tone="danger" icon={<AlertIcon size={18} />}>
          {error}
        </Alert>
      )}

      {result && result.orders.length === 0 && (
        <EmptyState
          icon={<PackageIcon size={24} />}
          title="No orders yet"
          description="Once you place an order it will show up here with full tracking."
          action={<ButtonLink href="/collections">Start shopping</ButtonLink>}
          className="rounded-lg border border-line bg-surface"
        />
      )}

      {result && result.orders.length > 0 && (
        <>
          <ul className="space-y-4">
            {result.orders.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>

          {result.hasNextPage && result.endCursor && (
            <div className="flex justify-center pt-2">
              <ButtonLink
                href={`/account/orders?after=${encodeURIComponent(result.endCursor)}`}
                variant="outline"
              >
                Load older orders
              </ButtonLink>
            </div>
          )}

          {rawCursor && (
            <div className="flex justify-center">
              <ButtonLink href="/account/orders" variant="ghost" size="sm">
                Back to most recent
              </ButtonLink>
            </div>
          )}
        </>
      )}
    </div>
  );
}
