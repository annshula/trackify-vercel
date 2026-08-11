import "server-only";
import { productRepository } from "@/lib/catalog";
import type { NavChild, NavLink } from "@/components/layout/header";

/**
 * Navigation derived from the real catalog.
 *
 * Shopify menus live in the Online Store channel, which a headless storefront
 * does not consume. Rather than hardcoding a fake menu, the top-level nav is
 * built from the collections that actually contain products.
 */
export async function getNavigation(): Promise<NavLink[]> {
  // Fixed top-level menu. Shop opens a mega menu built from the collections
  // that actually contain products — each with a cover image and item count.
  const collections = await productRepository.getAllCollections();
  const populated = collections
    .filter((collection) => collection.productIds.length > 0)
    .sort((a, b) => b.productIds.length - a.productIds.length);

  const shopChildren: NavChild[] = populated.slice(0, 8).map((collection) => ({
    href: `/collections/${collection.handle}`,
    label: collection.title,
    meta: `${collection.productIds.length} ${collection.productIds.length === 1 ? "piece" : "pieces"}`,
    image: collection.image
      ? {
          url: collection.image.url,
          alt: collection.image.altText ?? collection.title,
        }
      : null,
  }));

  return [
    { href: "/", label: "Home" },
    { href: "/collections", label: "Shop", children: shopChildren },
    { href: "/about", label: "About" },
  ];
}

/** Search suggestions taken from the most-used product types in the catalog. */
export async function getPopularSearches(limit = 6): Promise<string[]> {
  const products = await productRepository.getAllProducts();
  const counts = new Map<string, number>();

  for (const product of products) {
    if (product.productType)
      counts.set(
        product.productType,
        (counts.get(product.productType) ?? 0) + 1,
      );
    if (product.vendor)
      counts.set(product.vendor, (counts.get(product.vendor) ?? 0) + 1);
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
    .map((collection) => ({
      handle: collection.handle,
      title: collection.title,
    }));
}
