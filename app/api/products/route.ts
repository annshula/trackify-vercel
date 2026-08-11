import { NextResponse } from 'next/server';
import { productRepository } from '@/lib/catalog';
import { primaryImage } from '@/lib/utils/image';

/**
 * GET /api/products?handles=a,b,c
 *
 * Resolves a list of handles to a trimmed product shape. Backs the client-side
 * "recently viewed" and wishlist rails, which know handles but not products.
 * Local catalog only — no Shopify request.
 */

export const runtime = 'nodejs';

const MAX_HANDLES = 24;

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const raw = url.searchParams.get('handles') ?? '';

  const handles = raw
    .split(',')
    .map((handle) => handle.trim())
    .filter((handle) => /^[a-z0-9-]{1,255}$/.test(handle))
    .slice(0, MAX_HANDLES);

  if (handles.length === 0) return NextResponse.json({ products: [] });

  const found = await productRepository.getProductsByHandles(handles);
  // Preserve the caller's ordering — "recently viewed" is order-sensitive.
  const byHandle = new Map(found.map((product) => [product.handle, product]));

  const products = handles
    .map((handle) => byHandle.get(handle))
    .filter((product): product is NonNullable<typeof product> => product !== undefined)
    .map((product) => {
      const image = primaryImage(product);
      return {
        handle: product.handle,
        title: product.title,
        vendor: product.vendor,
        price: product.priceRange.min,
        currencyCode: product.priceRange.currencyCode,
        image: image ? { url: image.url, altText: image.altText } : null,
        available: product.variants.some((variant) => variant.availableForSale),
      };
    });

  return NextResponse.json({ products }, { headers: { 'Cache-Control': 'private, max-age=60' } });
}
