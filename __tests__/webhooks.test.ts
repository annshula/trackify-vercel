import { describe, expect, it, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { isDuplicateWebhook, resetWebhookDedupe, verifyWebhookSignature } from '@/services/webhooks/verify';

const SECRET = 'test-webhook-secret';

function sign(body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('base64');
}

describe('webhook HMAC verification', () => {
  const body = JSON.stringify({ id: 123, title: 'Test product' });

  it('accepts a correctly signed payload', () => {
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it('rejects a payload signed with the wrong secret', () => {
    expect(verifyWebhookSignature(body, sign(body, 'not-the-secret'))).toBe(false);
  });

  it('rejects when the body is tampered with after signing', () => {
    const signature = sign(body);
    const tampered = JSON.stringify({ id: 123, title: 'Tampered product' });
    expect(verifyWebhookSignature(tampered, signature)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });

  it('rejects a signature of the wrong length without throwing', () => {
    // timingSafeEqual throws on length mismatch — the guard must run first.
    expect(() => verifyWebhookSignature(body, 'c2hvcnQ=')).not.toThrow();
    expect(verifyWebhookSignature(body, 'c2hvcnQ=')).toBe(false);
  });

  it('rejects a non-base64 signature without throwing', () => {
    expect(() => verifyWebhookSignature(body, '!!!not base64!!!')).not.toThrow();
    expect(verifyWebhookSignature(body, '!!!not base64!!!')).toBe(false);
  });

  it('verifies identically for a Buffer body', () => {
    expect(verifyWebhookSignature(Buffer.from(body, 'utf8'), sign(body))).toBe(true);
  });

  it('is sensitive to a single-byte change', () => {
    const almost = `${body.slice(0, -2)}}`;
    expect(verifyWebhookSignature(almost, sign(body))).toBe(false);
  });
});

describe('webhook deduplication', () => {
  beforeEach(() => resetWebhookDedupe());

  it('treats the first delivery of an id as new', () => {
    expect(isDuplicateWebhook('webhook-1')).toBe(false);
  });

  it('treats a repeated id as a duplicate', () => {
    isDuplicateWebhook('webhook-1');
    expect(isDuplicateWebhook('webhook-1')).toBe(true);
    expect(isDuplicateWebhook('webhook-1')).toBe(true);
  });

  it('keeps distinct ids independent', () => {
    expect(isDuplicateWebhook('webhook-a')).toBe(false);
    expect(isDuplicateWebhook('webhook-b')).toBe(false);
    expect(isDuplicateWebhook('webhook-a')).toBe(true);
  });

  it('never marks a missing id as duplicate', () => {
    expect(isDuplicateWebhook(null)).toBe(false);
    expect(isDuplicateWebhook(null)).toBe(false);
  });

  it('bounds the cache so it cannot grow without limit', () => {
    for (let i = 0; i < 2500; i += 1) isDuplicateWebhook(`id-${i}`);
    // The oldest entries are evicted, so an early id looks new again.
    expect(isDuplicateWebhook('id-0')).toBe(false);
    // Recent ids are still remembered.
    expect(isDuplicateWebhook('id-2499')).toBe(true);
  });
});
