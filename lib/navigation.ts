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
/**
 * The store's categories: collections whose title matches a product type.
 *
 * Categories are Shopify automated collections ("product type equals
 * <title>", see scripts/catalog-structure.ts), so this picks up every one —
 * including new ones created in Shopify — while leaving out merchandising
 * collections like Best Seller or Bundles, which cut across categories.
 * Largest first; empty ones are skipped.
 */
export async function getCategoryCollections() {
  const [collections, products] = await Promise.all([
    productRepository.getAllCollections(),
    productRepository.getAllProducts(),
  ]);
  const productTypes = new Set(
    products.map((product) => product.productType.trim().toLowerCase()).filter(Boolean),
  );
  return collections
    .filter(
      (collection) =>
        collection.productIds.length > 0 &&
        productTypes.has(collection.title.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        b.productIds.length - a.productIds.length || a.title.localeCompare(b.title),
    );
}

export async function getNavigation(): Promise<NavLink[]> {
  // Fixed top-level menu. Shop opens a mega menu listing every category —
  // each with a cover image and item count.
  const categories = await getCategoryCollections();

  const shopChildren: NavChild[] = categories.slice(0, 12).map((collection) => ({
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

export async function getFooterCollections(limit = 8) {
  const categories = await getCategoryCollections();
  return categories
    .slice(0, limit)
    .map((collection) => ({
      handle: collection.handle,
      title: collection.title,
    }));
}
