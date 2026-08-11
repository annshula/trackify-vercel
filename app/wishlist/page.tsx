import type { Metadata } from 'next';
import { noIndex } from '@/lib/seo/metadata';
import { Breadcrumb } from '@/components/ui/primitives';
import { WishlistGrid } from '@/components/product/wishlist-grid';

export const metadata: Metadata = { title: 'Saved items', robots: noIndex };

export default function WishlistPage() {
  return (
    <div className="container-page">
      <div className="py-4">
        <Breadcrumb items={[{ href: '/', label: 'Home' }, { label: 'Saved items' }]} />
      </div>

      <header className="max-w-2xl pb-8">
        <h1 className="text-4xl">Saved items</h1>
        <p className="mt-3 text-sm text-ink-muted">
          Kept in this browser so they are here when you come back.
        </p>
      </header>

      <WishlistGrid />
    </div>
  );
}
