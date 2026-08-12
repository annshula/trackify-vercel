import type { Metadata } from 'next';
import { requireCustomer } from '@/lib/auth/guard';
import { getCustomer } from '@/services/shopify/customer-service';
import { noIndex } from '@/lib/seo/metadata';
import { AddressManager } from '@/components/account/address-manager';
import { Alert } from '@/components/ui/primitives';
import { AlertIcon } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Addresses', robots: noIndex };
export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  await requireCustomer('/account/addresses');

  const customer = await getCustomer().catch(() => null);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Addresses</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Saved addresses speed up checkout. They are stored securely with your account.
        </p>
      </header>

      {!customer ? (
        <Alert tone="danger" icon={<AlertIcon size={18} />}>
          We could not load your addresses. Please refresh, or try again shortly.
        </Alert>
      ) : (
        <AddressManager
          addresses={customer.addresses}
          defaultAddressId={customer.defaultAddressId}
        />
      )}
    </div>
  );
}
