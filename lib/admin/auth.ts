import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/validation/env';

/**
 * Bearer-token guard for the internal merchant/diagnostic routes.
 *
 * These endpoints can trigger a full Shopify sync and read catalog internals,
 * so they are never reachable by a customer. With no ADMIN_API_KEY configured
 * they fail closed rather than opening up.
 */
export function isAuthorizedAdminRequest(request: Request): boolean {
  const expected = serverEnv().adminApiKey;
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer',
      // Diagnostics must never end up in a search index.
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
