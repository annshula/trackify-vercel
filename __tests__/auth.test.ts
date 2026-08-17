import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { createCodeChallenge, createCodeVerifier, createNonce, createState, timingSafeEqualString } from '@/lib/auth/pkce';
import { decryptJson, encryptJson, isExpired } from '@/lib/auth/session';

describe('PKCE', () => {
  it('creates a verifier of legal length', () => {
    const verifier = createCodeVerifier();
    // RFC 7636 requires 43–128 characters.
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it('uses only unreserved base64url characters', () => {
    expect(createCodeVerifier()).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('never repeats a verifier', () => {
    const seen = new Set(Array.from({ length: 200 }, () => createCodeVerifier()));
    expect(seen.size).toBe(200);
  });

  it('derives the challenge as base64url(SHA-256(verifier))', () => {
    const verifier = createCodeVerifier();
    const expected = createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(createCodeChallenge(verifier)).toBe(expected);
  });

  it('produces a different challenge for a different verifier', () => {
    expect(createCodeChallenge(createCodeVerifier())).not.toBe(
      createCodeChallenge(createCodeVerifier()),
    );
  });

  it('creates unique state and nonce values', () => {
    expect(new Set(Array.from({ length: 100 }, createState)).size).toBe(100);
    expect(new Set(Array.from({ length: 100 }, createNonce)).size).toBe(100);
  });
});

describe('constant-time comparison', () => {
  it('matches identical strings', () => {
    expect(timingSafeEqualString('abc123', 'abc123')).toBe(true);
  });

  it('rejects different strings of the same length', () => {
    expect(timingSafeEqualString('abc123', 'abc124')).toBe(false);
  });

  it('rejects different lengths without throwing', () => {
    expect(() => timingSafeEqualString('short', 'a-much-longer-value')).not.toThrow();
    expect(timingSafeEqualString('short', 'a-much-longer-value')).toBe(false);
  });

  it('rejects an empty string against a real value', () => {
    expect(timingSafeEqualString('', 'secret')).toBe(false);
  });
});

describe('session encryption', () => {
  const session = {
    accessToken: 'shcat_live_example_token',
    refreshToken: 'refresh_example_token',
    expiresAt: Date.now() + 3_600_000,
    idToken: 'id_example_token',
  };

  it('round-trips a session', () => {
    expect(decryptJson(encryptJson(session))).toEqual(session);
  });

  it('produces ciphertext that does not contain the plaintext token', () => {
    const encrypted = encryptJson(session);
    expect(encrypted).not.toContain('shcat_live_example_token');
    expect(Buffer.from(encrypted, 'base64url').toString('utf8')).not.toContain(session.accessToken);
  });

  it('uses a fresh IV so the same input encrypts differently each time', () => {
    expect(encryptJson(session)).not.toBe(encryptJson(session));
  });

  it('returns null for tampered ciphertext rather than trusting it', () => {
    const encrypted = encryptJson(session);
    const bytes = Buffer.from(encrypted, 'base64url');
    // Flip a bit in the ciphertext body; GCM authentication must catch it.
    const last = bytes.length - 1;
    bytes.writeUInt8(bytes.readUInt8(last) ^ 0xff, last);
    expect(decryptJson(bytes.toString('base64url'))).toBeNull();
  });

  it('returns null for garbage input', () => {
    expect(decryptJson('not-valid-ciphertext')).toBeNull();
    expect(decryptJson('')).toBeNull();
  });

  it('returns null for a truncated payload', () => {
    expect(decryptJson(encryptJson(session).slice(0, 10))).toBeNull();
  });
});

describe('session expiry', () => {
  it('treats a future token as valid', () => {
    expect(isExpired({ accessToken: 'a', refreshToken: null, idToken: null, sessionId: 's', customerId: null, expiresAt: Date.now() + 600_000 })).toBe(false);
  });

  it('treats a past token as expired', () => {
    expect(isExpired({ accessToken: 'a', refreshToken: null, idToken: null, sessionId: 's', customerId: null, expiresAt: Date.now() - 1000 })).toBe(true);
  });

  it('refreshes early, inside the 60s window, rather than at the edge', () => {
    expect(isExpired({ accessToken: 'a', refreshToken: null, idToken: null, sessionId: 's', customerId: null, expiresAt: Date.now() + 30_000 })).toBe(true);
  });
});
