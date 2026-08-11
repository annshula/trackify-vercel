import { NextResponse } from 'next/server';
import { productRepository } from '@/lib/catalog';
import { primaryImage } from '@/lib/utils/image';

/**
 * GET /api/search?q=…
 *
 * Backs the instant-search overlay. Reads the local catalog only — a keystroke
 * never reaches Shopify. Deliberately returns a trimmed shape so the payload
 * stays small on mobile connections.
 */

export const runtime = 'nodejs';

const MAX_TERM_LENGTH = 100;
const requestLog = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10_000;
const MAX_REQUESTS = 40;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = requestLog.get(key);

  if (!entry || now > entry.resetAt) {
    requestLog.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic cleanup keeps the map from growing without bound.
    if (requestLog.size > 5000) {
      for (const [k, v] of requestLog) if (now > v.resetAt) requestLog.delete(k);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const term = (url.searchParams.get('q') ?? '').trim().slice(0, MAX_TERM_LENGTH);

  const clientKey =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'anonymous';

  if (rateLimited(clientKey)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (term.length < 2) {
    return NextResponse.json({ products: [], collections: [], terms: [] });
  }

  const suggestions = await productRepository.suggest(term, 6);

  return NextResponse.json(
    {
      products: suggestions.products.map((product) => {
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
      }),
      collections: suggestions.collections.map((collection) => ({
        handle: collection.handle,
        title: collection.title,
        count: collection.productIds.length,
      })),
      terms: suggestions.terms,
    },
    {
      headers: {
        // Short private cache: repeated keystrokes of the same prefix are free,
        // but a catalog update is visible almost immediately.
        'Cache-Control': 'private, max-age=30',
      },
    },
  );
}
