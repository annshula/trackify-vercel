import type { CatalogProduct } from "@/types/catalog";

/**
 * What the bag may show about a variant, built on the server from the synced
 * catalog. The browser stores only `{ variantId, quantity }` per line and looks
 * everything else up here, so a stale or tampered browser can never display —
 * or submit — a price. Shopify re-prices the whole bag when the checkout cart
 * is created (see startCheckout in lib/cart/actions.ts).
 */

export type BagVariant = {
  productId: string;
  /** Shopify handle of the product this variant belongs to. */
  handle: string;
  productName: string;
  /** Option values joined for display ("Black", "2PCS · Matte"); empty for a default-title variant. */
  variantLabel: string;
  price: number;
  compareAtPrice: number | null;
  /** Currency of `price` / `compareAtPrice` — the catalog's base currency. */
  currency: string;
  image: string | null;
  href: string;
  available: boolean;
  /** True when the variants are pack sizes — buying more means picking a bigger pack, not a stepper. */
  hasPackOption: boolean;
  /** Most the bag will hold of this variant. */
  maxQuantity: number;
};

export type BagCatalog = {
  currency: string;
  variants: Record<string, BagVariant>;
};

export const MAX_BAG_QUANTITY = 10;

/** An option that is really a pack-size choice (e.g. "Quantity": 1PC / 2PCS / 3PCS). */
const PACK_OPTION = /^(quantity|qty|pack)$/i;

export function buildBagCatalog(products: CatalogProduct[]): BagCatalog {
  const variants: Record<string, BagVariant> = {};
  let currency = "USD";

  for (const product of products) {
    currency = product.priceRange.currencyCode || currency;
    const hasPackOption = product.options.some((option) => PACK_OPTION.test(option.name));

    for (const variant of product.variants) {
      const image =
        (variant.imageId && product.images.find((img) => img.id === variant.imageId)) ||
        product.images[0] ||
        null;

      variants[variant.id] = {
        productId: product.id,
        handle: product.handle,
        productName: product.title,
        variantLabel: variant.selectedOptions
          .map((option) => option.value)
          .filter((value) => value !== "Default Title")
          .join(" · "),
        price: variant.price,
        compareAtPrice:
          variant.compareAtPrice !== null && variant.compareAtPrice > variant.price
            ? variant.compareAtPrice
            : null,
        currency: variant.currencyCode,
        image: image?.url ?? null,
        href: `/products/${product.handle}`,
        available: variant.availableForSale,
        hasPackOption,
        // When stock is hard-limited, never let the bag hold more than is left.
        maxQuantity:
          variant.inventoryPolicy === "DENY" && typeof variant.inventoryQuantity === "number"
            ? Math.max(1, Math.min(MAX_BAG_QUANTITY, variant.inventoryQuantity))
            : MAX_BAG_QUANTITY,
      };
    }
  }

  return { currency, variants };
}
