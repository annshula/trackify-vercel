import { NextResponse } from 'next/server';
import { handleWebhook } from '@/services/webhooks/handlers';
import { isDuplicateWebhook, verifyWebhookSignature } from '@/services/webhooks/verify';
import { serverEnv } from '@/lib/validation/env';

/**
 * POST /api/webhooks/shopify
 *
 * Ordering of checks matters:
 *   1. HMAC — reject unauthenticated traffic before doing any work.
 *   2. Shop domain — reject events from a store that is not ours.
 *   3. Dedupe — Shopify retries; replaying a delete would corrupt the catalog.
 *   4. Handle — re-fetch authoritative data, update only affected records.
 *
 * A processing failure returns 500 so Shopify retries with backoff.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const topic = request.headers.get('x-shopify-topic');
  const webhookId = request.headers.get('x-shopify-webhook-id');
  const shopDomain = request.headers.get('x-shopify-shop-domain');
  const signature = request.headers.get('x-shopify-hmac-sha256');

  // Read the body exactly once, as raw text — the HMAC is over these bytes.
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: 'Unreadable body' }, { status: 400 });
  }

  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let verified: boolean;
  try {
    verified = verifyWebhookSignature(rawBody, signature);
  } catch (error) {
    // Misconfiguration, not an attack — surface it loudly in logs, fail closed.
    console.error('[webhook] verification unavailable:', (error as Error).message);
    return NextResponse.json({ error: 'Webhook verification unavailable' }, { status: 500 });
  }

  if (!verified) {
    console.warn('[webhook] rejected: invalid HMAC', { topic, webhookId });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const expectedDomain = serverEnv().storeDomain;
  if (shopDomain && shopDomain.toLowerCase() !== expectedDomain) {
    console.warn('[webhook] rejected: unexpected shop domain', { shopDomain, topic });
    return NextResponse.json({ error: 'Unexpected shop domain' }, { status: 401 });
  }

  if (!topic) {
    return NextResponse.json({ error: 'Missing X-Shopify-Topic' }, { status: 400 });
  }

  // Acknowledge duplicates without redoing the work.
  if (isDuplicateWebhook(webhookId)) {
    return NextResponse.json({ ok: true, deduped: true, topic }, { status: 200 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    // Malformed JSON will never succeed on retry — acknowledge so Shopify stops.
    console.error('[webhook] malformed JSON', { topic, webhookId });
    return NextResponse.json({ ok: false, error: 'Malformed JSON' }, { status: 200 });
  }

  try {
    const result = await handleWebhook(topic, payload);
    console.info('[webhook] processed', { topic, webhookId, action: result.action, detail: result.detail });
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (error) {
    // Log the topic and id only — the payload can contain merchant data.
    console.error('[webhook] processing failed', {
      topic,
      webhookId,
      message: (error as Error).message,
    });
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
