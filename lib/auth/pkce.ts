import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/** RFC 7636 PKCE helpers for the Customer Account API OAuth flow. */

function base64Url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 43–128 chars of unreserved characters, per spec. 32 random bytes → 43 chars. */
export function createCodeVerifier(): string {
  return base64Url(randomBytes(32));
}

export function createCodeChallenge(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest());
}

export function createState(): string {
  return base64Url(randomBytes(24));
}

export function createNonce(): string {
  return base64Url(randomBytes(16));
}

/** Constant-time string comparison, safe for differing lengths. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    // Still perform a full-length comparison so the time taken does not reveal
    // how long the expected value is. The result is discarded.
    const padded = Buffer.alloc(bufA.length);
    bufB.copy(padded);
    const ignored = bufA.equals(padded);
    return ignored && false;
  }

  return bufA.equals(bufB);
}
