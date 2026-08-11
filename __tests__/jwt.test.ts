import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, idTokenNonce } from '@/lib/auth/jwt';

/**
 * Guards the one thing this app actually depends on the id_token for: reading
 * back the `nonce` claim so it can be compared against the nonce generated at
 * /account/authorize. See lib/auth/jwt.ts for why signature verification is
 * deliberately out of scope.
 */

function fakeJwt(payload: Record<string, unknown>, header: Record<string, unknown> = { alg: 'RS256' }): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode(header)}.${encode(payload)}.signature-not-checked`;
}

describe('decodeJwtPayload', () => {
  it('decodes a well-formed token', () => {
    const token = fakeJwt({ nonce: 'abc123', sub: 'customer-1' });
    expect(decodeJwtPayload(token)).toEqual({ nonce: 'abc123', sub: 'customer-1' });
  });

  it('returns null for a token with the wrong number of segments', () => {
    expect(decodeJwtPayload('not.a.valid.jwt.token')).toBeNull();
    expect(decodeJwtPayload('onlyonesegment')).toBeNull();
  });

  it('returns null for a payload segment that is not valid base64url JSON', () => {
    expect(decodeJwtPayload('header.%%%not-base64%%%.sig')).toBeNull();
  });

  it('returns null when the decoded payload is not a JSON object', () => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    expect(decodeJwtPayload(`${encode('header')}.${encode('just a string')}.sig`)).toBeNull();
    expect(decodeJwtPayload(`${encode('header')}.${encode(42)}.sig`)).toBeNull();
  });

  it('handles base64url padding correctly regardless of payload length', () => {
    // Payload lengths chosen so the base64url output lands on each padding case.
    for (const length of [1, 2, 3, 4, 5]) {
      const token = fakeJwt({ n: 'x'.repeat(length) });
      expect(decodeJwtPayload(token)?.n).toBe('x'.repeat(length));
    }
  });
});

describe('idTokenNonce', () => {
  it('extracts a string nonce claim', () => {
    expect(idTokenNonce(fakeJwt({ nonce: 'expected-nonce' }))).toBe('expected-nonce');
  });

  it('returns null when there is no nonce claim', () => {
    expect(idTokenNonce(fakeJwt({ sub: 'customer-1' }))).toBeNull();
  });

  it('returns null when the nonce claim is not a string', () => {
    expect(idTokenNonce(fakeJwt({ nonce: 12345 }))).toBeNull();
    expect(idTokenNonce(fakeJwt({ nonce: null }))).toBeNull();
  });

  it('returns null for a malformed token rather than throwing', () => {
    expect(idTokenNonce('garbage')).toBeNull();
  });
});
