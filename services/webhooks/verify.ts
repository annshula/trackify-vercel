import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { serverEnv } from '@/lib/validation/env';

/**
 * Shopify webhook HMAC verification.
 *
 * MUST run against the raw request body — any JSON round-trip changes the bytes
 * and invalidates the signature.
 */
export function verifyWebhookSignature(rawBody: string | Buffer, headerSignature: string | null): boolean {
  const secret = serverEnv().webhookSecret;
  if (!secret) {
    throw new Error('SHOPIFY_WEBHOOK_SECRET is not set — webhooks cannot be verified.');
  }
  if (!headerSignature) return false;

  const computed = createHmac('sha256', secret)
    .update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody)
    .digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(headerSignature, 'base64');
  } catch {
    return false;
  }

  // timingSafeEqual throws on length mismatch, so check length first — the
  // length of a signature is not a secret.
  if (provided.length !== computed.length) return false;
  return timingSafeEqual(provided, computed);
}

/**
 * Bounded LRU of processed webhook IDs.
 *
 * Shopify retries aggressively and can deliver the same event more than once;
 * replaying a delete after a re-create would corrupt the catalog.
 */
const MAX_SEEN = 2000;
const seen = new Map<string, number>();

export function isDuplicateWebhook(webhookId: string | null): boolean {
  if (!webhookId) return false;
  if (seen.has(webhookId)) {
    seen.delete(webhookId);
    seen.set(webhookId, Date.now());
    return true;
  }
  seen.set(webhookId, Date.now());
  if (seen.size > MAX_SEEN) {
    const oldest = seen.keys().next().value;
    if (oldest !== undefined) seen.delete(oldest);
  }
  return false;
}

/** Test seam — resets the dedupe cache. */
export function resetWebhookDedupe(): void {
  seen.clear();
}
