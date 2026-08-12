import type { Metadata } from 'next';
import { noIndex } from '@/lib/seo/metadata';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { UserIcon } from '@/components/ui/icons';

export const metadata: Metadata = { title: 'Accounts unavailable', robots: noIndex };

export default function AccountUnavailablePage() {
  return (
    <div className="container-page">
      <EmptyState
        icon={<UserIcon size={24} />}
        title="Accounts are not connected yet"
        description="Sign-in is not available on this store yet. Shopping and checkout work as normal in the meantime."
        action={<ButtonLink href="/collections">Continue shopping</ButtonLink>}
      />
    </div>
  );
}
