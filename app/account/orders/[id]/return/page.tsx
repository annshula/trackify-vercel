import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireCustomer } from '@/lib/auth/guard';
import { getOrder } from '@/services/shopify/customer-service';
import { isReturnable, returnableLineItems } from '@/lib/account/order-status';
import { noIndex } from '@/lib/seo/metadata';
import { Breadcrumb } from '@/components/ui/primitives';
import { ReturnRequestForm } from '@/components/account/return-request-form';

export const metadata: Metadata = { title: 'Request a return', robots: noIndex };
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function OrderReturnPage({ params }: PageProps) {
  const { id } = await params;
  await requireCustomer(`/account/orders/${id}/return`);

  const orderId = decodeURIComponent(id);
  const order = await getOrder(orderId).catch(() => null);
  if (!order || !isReturnable(order)) notFound();

  const items = returnableLineItems(order);
  if (items.length === 0) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: '/account', label: 'Account' },
          { href: '/account/orders', label: 'Orders' },
          { href: `/account/orders/${id}`, label: order.name },
          { label: 'Return' },
        ]}
      />

      <header>
        <h1 className="text-3xl">Return items from {order.name}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Choose the items and quantities you&apos;d like to return, and tell us why.
        </p>
      </header>

      <ReturnRequestForm order={order} items={items} redirectTo={`/account/orders/${id}`} />
    </div>
  );
}
