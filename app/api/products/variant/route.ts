import { NextResponse } from 'next/server';
import { productRepository } from '@/lib/catalog';
import { defaultVariant } from '@/lib/catalog/selectors';

/**
 * GET /api/products/variant?handle=…
 *
 * Resolves a product handle to its default purchasable variant id.
 * Needed by surfaces that only know a handle (saved items) but must add a
 * specific variant to the cart. Local catalog only.
 */

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<NextResponse> {
  const handle = new URL(request.url).searchParams.get('handle') ?? '';

  if (!/^[a-z0-9-]{1,255}$/.test(handle)) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
  }

  const product = await productRepository.getProductByHandle(handle);
  if (!product) return NextResponse.json({ variantId: null }, { status: 404 });

  const variant = defaultVariant(product);

  return NextResponse.json({
    variantId: variant?.availableForSale ? variant.id : null,
    // A product with more than one option needs a real choice, not a default.
    requiresSelection: product.options.filter((option) => option.values.length > 1).length > 0,
  });
}
