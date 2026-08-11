import { NextResponse } from 'next/server';
import { isAuthorizedAdminRequest, unauthorizedResponse } from '@/lib/admin/auth';
import { fullSync } from '@/services/synchronization/sync-service';
import { CACHE_TAGS, purgePath, purgeTag } from '@/lib/catalog/tags';

/**
 * POST /api/admin/sync
 *
 * Triggers a full catalog synchronization from a deploy hook or cron, so a
 * scheduled rebuild does not require shell access to run `npm run shopify:sync`.
 * Protected by ADMIN_API_KEY.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A large catalog can take a while; give it room before the platform times out.
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorizedAdminRequest(request)) return unauthorizedResponse();

  try {
    const logs: string[] = [];
    const stats = await fullSync({ onProgress: (message) => logs.push(message) });

    // A full sync can change anything — purge the whole catalog surface.
    purgeTag(CACHE_TAGS.catalog);
    purgePath('/', 'layout');

    return NextResponse.json(
      { ok: true, stats, logs },
      { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch (error) {
    console.error('[admin/sync] failed:', (error as Error).message);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function GET(): Promise<Response> {
  // Sync mutates the catalog — never allow it on a GET, which a crawler or
  // prefetch could trigger.
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
