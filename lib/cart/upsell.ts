import type { CatalogProduct } from "@/types/catalog";
import { bestSellersProxy } from "@/lib/catalog/recommendations";
import { defaultVariant, productRating } from "@/lib/catalog/selectors";

/** What the bag's "Add to your order" card needs — small enough to hand to a client component. */
export type CartUpsell = {
  handle: string;
  productId: string;
  title: string;
  blurb: string | null;
  image: string | null;
  variantId: string;
  price: number;
  compareAt: number | null;
  currencyCode: string;
  rating: { value: number; count: number } | null;
};

/** First sentence-ish of the description, cut at a word boundary — the offer card has room for one line. */
function blurbOf(product: CatalogProduct): string | null {
  const subtitle = product.metafields["custom.subtitle"]?.trim();
  if (subtitle) return subtitle;
  const text = product.description.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= 90) return text;
  const cut = text.slice(0, 90);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[.,;:–—-]+$/, "")}…`;
}

/**
 * A few in-stock products to offer next to the bag. The client drops whatever
 * is already in the bag and shows the first that's left. Derived from catalog
 * signals only — no invented popularity.
 */
export function cartUpsellCandidates(products: CatalogProduct[], limit = 4): CartUpsell[] {
  return bestSellersProxy(products, 12)
    .flatMap((product): CartUpsell[] => {
      const variant = defaultVariant(product);
      if (!variant || !variant.availableForSale) return [];
      return [
        {
          handle: product.handle,
          productId: product.id,
          title: product.title,
          blurb: blurbOf(product),
          image: product.images[0]?.url ?? null,
          variantId: variant.id,
          price: variant.price,
          compareAt:
            variant.compareAtPrice && variant.compareAtPrice > variant.price
              ? variant.compareAtPrice
              : null,
          currencyCode: variant.currencyCode,
          rating: productRating(product),
        },
      ];
    })
    .slice(0, limit);
}
