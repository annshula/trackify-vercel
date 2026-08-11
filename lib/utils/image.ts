import type { CatalogImage, CatalogProduct, CatalogVariant } from '@/types/catalog';

/**
 * Shopify CDN image helpers.
 *
 * Shopify serves resized/reformatted variants via query params, which lets
 * next/image request exactly the pixels a slot needs instead of a 2000px
 * original scaled down in the browser.
 */

export function shopifyImageUrl(
  url: string,
  options: { width?: number; height?: number; crop?: 'center' | 'top' | 'bottom' } = {},
): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('shopify.com')) return url;
    if (options.width) parsed.searchParams.set('width', String(options.width));
    if (options.height) parsed.searchParams.set('height', String(options.height));
    if (options.crop) parsed.searchParams.set('crop', options.crop);
    return parsed.toString();
  } catch {
    return url;
  }
}

/** A meaningful alt text, falling back to the product title — never empty. */
export function imageAlt(image: CatalogImage | null | undefined, productTitle: string): string {
  const alt = image?.altText?.trim();
  return alt && alt.length > 0 ? alt : productTitle;
}

export function primaryImage(product: CatalogProduct): CatalogImage | null {
  return product.images[0] ?? null;
}

/** The second image, used for the hover swap on product cards. */
export function secondaryImage(product: CatalogProduct): CatalogImage | null {
  return product.images[1] ?? null;
}

export function variantImage(product: CatalogProduct, variant: CatalogVariant | null): CatalogImage | null {
  if (variant?.imageId) {
    const match = product.images.find((image) => image.id === variant.imageId);
    if (match) return match;
  }
  return primaryImage(product);
}

/** Blur placeholder — a flat tinted rect, so no extra request is made. */
export const BLUR_DATA_URL =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="10"><rect width="8" height="10" fill="#efece8"/></svg>',
  ).toString('base64');
