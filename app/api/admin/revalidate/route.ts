import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthorizedAdminRequest, unauthorizedResponse } from '@/lib/admin/auth';
import { CACHE_TAGS, purgePath, purgeTag } from '@/lib/catalog/tags';
import { invalidateCatalogCache } from '@/lib/catalog';

/**
 * POST /api/admin/revalidate
 *
 * Manual cache purge — for when a webhook was missed, or after editing content
 * that is not webhook-driven.
 *
 * Body: { tags?: string[], paths?: string[], catalog?: boolean }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  tags: z.array(z.string().min(1).max(200)).max(50).optional(),
  paths: z.array(z.string().startsWith('/').max(500)).max(50).optional(),
  catalog: z.boolean().optional(),
});

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorizedAdminRequest(request)) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
  }

  const purged: { tags: string[]; paths: string[] } = { tags: [], paths: [] };

  if (parsed.data.catalog) {
    // Drop the in-memory copy too, or the next read serves the stale catalog.
    invalidateCatalogCache();
    purgeTag(CACHE_TAGS.catalog);
    purged.tags.push(CACHE_TAGS.catalog);
  }

  for (const tag of parsed.data.tags ?? []) {
    purgeTag(tag);
    purged.tags.push(tag);
  }

  for (const path of parsed.data.paths ?? []) {
    purgePath(path);
    purged.paths.push(path);
  }

  return NextResponse.json(
    { ok: true, purged },
    { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
  );
}
