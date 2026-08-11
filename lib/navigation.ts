import 'server-only';
import { productRepository } from '@/lib/catalog';
import type { NavLink } from '@/components/layout/header';

/**
 * Navigation derived from the real catalog.
 *
 * Shopify menus live in the Online Store channel, which a headless storefront
 * does not consume. Rather than hardcoding a fake menu, the top-level nav is
 * built from the collections that actually contain products.
 */
export async function getNavigation(): Promise<NavLink[]> {
  const collections = await productRepository.getAllCollections();
  const populated = collections
    .filter((collection) => collection.productIds.length > 0)
    .sort((a, b) => b.productIds.length - a.productIds.length);

  const featured = populated.slice(0, 4).map((collection) => ({
    href: `/collections/${collection.handle}`,
    label: collection.title,
  }));

  const overflow = populated.slice(4, 12).map((collection) => ({
    href: `/collections/${collection.handle}`,
    label: collection.title,
  }));

  const nav: NavLink[] = [
    {
      href: '/collections',
      label: 'Shop',
      children: [...featured, ...overflow].slice(0, 8),
    },
    ...featured.slice(0, 3),
  ];

  return nav;
}

/** Search suggestions taken from the most-used product types in the catalog. */
export async function getPopularSearches(limit = 6): Promise<string[]> {
  const products = await productRepository.getAllProducts();
  const counts = new Map<string, number>();

  for (const product of products) {
    if (product.productType) counts.set(product.productType, (counts.get(product.productType) ?? 0) + 1);
    if (product.vendor) counts.set(product.vendor, (counts.get(product.vendor) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

export async function getFooterCollections(limit = 6) {
  const collections = await productRepository.getAllCollections();
  return collections
    .filter((collection) => collection.productIds.length > 0)
    .sort((a, b) => b.productIds.length - a.productIds.length)
    .slice(0, limit)
    .map((collection) => ({ handle: collection.handle, title: collection.title }));
}
