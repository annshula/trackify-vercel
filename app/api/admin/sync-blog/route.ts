import { NextResponse } from 'next/server';
import { isAuthorizedAdminRequest, unauthorizedResponse } from '@/lib/admin/auth';
import { fullSyncBlogContent } from '@/services/synchronization/sync-service';
import { CACHE_TAGS, purgePath, purgeTag } from '@/lib/catalog/tags';
import { invalidateBlogCache } from '@/lib/catalog/blog';

/**
 * POST /api/admin/sync-blog
 *
 * Triggers a full blog/article synchronization from a deploy hook or cron —
 * separate from /api/admin/sync because blog content needs the `read_content`
 * Admin API scope, which a store may not have granted yet. Protected by
 * ADMIN_API_KEY.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorizedAdminRequest(request)) return unauthorizedResponse();

  try {
    const logs: string[] = [];
    const stats = await fullSyncBlogContent({ onProgress: (message) => logs.push(message) });

    invalidateBlogCache();
    purgeTag(CACHE_TAGS.blogCatalog);
    purgePath('/blogs', 'layout');

    return NextResponse.json(
      { ok: true, stats, logs },
      { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch (error) {
    console.error('[admin/sync-blog] failed:', (error as Error).message);
    return NextResponse.json(
      { ok: false, error: (error as Error).message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

export async function GET(): Promise<Response> {
  return NextResponse.json({ error: 'Use POST' }, { status: 405 });
}
