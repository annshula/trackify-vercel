import { NextResponse } from 'next/server';
import { isAuthorizedAdminRequest, unauthorizedResponse } from '@/lib/admin/auth';
import { fullSyncShopContent } from '@/services/synchronization/sync-service';
import { CACHE_TAGS, purgePath, purgeTag } from '@/lib/catalog/tags';
import { invalidateShopCache } from '@/lib/catalog/shop';

/**
 * POST /api/admin/sync-shop
 *
 * Triggers a store contact + policies synchronization from a deploy hook or
 * cron — separate from /api/admin/sync-blog because it reads the Admin
 * *and* Storefront APIs for a single small document, not a content list.
 * Protected by ADMIN_API_KEY.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorizedAdminRequest(request)) return unauthorizedResponse();

  try {
    const logs: string[] = [];
    const stats = await fullSyncShopContent({ onProgress: (message) => logs.push(message) });

    invalidateShopCache();
    purgeTag(CACHE_TAGS.shop);
    // All five handles read from the same shop.json — purge each ISR entry.
    for (const handle of ['contact', 'shipping', 'returns', 'privacy', 'terms']) {
      purgePath(`/pages/${handle}`);
    }

    return NextResponse.json(
      { ok: true, stats, logs },
      { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch (error) {
    console.error('[admin/sync-shop] failed:', (error as Error).message);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
