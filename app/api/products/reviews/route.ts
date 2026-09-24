import { NextResponse } from 'next/server';
import { reviewProvider } from '@/components/product/reviews';

/**
 * GET /api/products/reviews?handle=…&page=…&rating=…
 *
 * Paginates/filters Judge.me reviews for the client-side ReviewGallery.
 * Keeps the Judge.me API token server-side — the browser only ever talks to
 * this route, never judge.me directly.
 */

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle') ?? '';
  const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  const ratingParam = url.searchParams.get('rating');
  const rating = ratingParam ? Number.parseInt(ratingParam, 10) : undefined;

  if (!/^[a-z0-9-]{1,255}$/.test(handle)) {
    return NextResponse.json({ error: 'Invalid handle' }, { status: 400 });
  }
  if (!reviewProvider) {
    return NextResponse.json({ error: 'No review provider configured' }, { status: 404 });
  }

  const data = await reviewProvider.list(handle, {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
  });

  return NextResponse.json(data);
}
