import 'server-only';
import { cookies } from 'next/headers';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { serverEnv } from '@/lib/validation/env';

/**
 * Customer session storage.
 *
 * The Shopify customer access token never reaches the browser in readable form.
 * It lives in an httpOnly, Secure, SameSite=Lax cookie, encrypted with
 * AES-256-GCM under SESSION_SECRET so a leaked cookie jar is not a leaked token.
 */

export const SESSION_COOKIE = '_tf_session';
export const OAUTH_STATE_COOKIE = '_tf_oauth';
export const CART_COOKIE = '_tf_cart';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export type CustomerSession = {
  accessToken: string;
  refreshToken: string | null;
  /** epoch ms */
  expiresAt: number;
  idToken: string | null;
};

export type OAuthTransaction = {
  codeVerifier: string;
  state: string;
  nonce: string;
  redirectTo: string;
};

function key(): Buffer {
  const secret = serverEnv().sessionSecret;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  // Hashing accepts either a 64-char hex secret or any sufficiently long passphrase.
  return createHash('sha256').update(secret).digest();
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptJson<T>(payload: string): T | null {
  try {
    const raw = Buffer.from(payload, 'base64url');
    if (raw.length <= IV_LENGTH + TAG_LENGTH) return null;
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  } catch {
    // Tampered, truncated, or encrypted under a rotated secret — treat as no session.
    return null;
  }
}

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
} as const;

export async function readSession(): Promise<CustomerSession | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return decryptJson<CustomerSession>(raw);
}

export async function writeSession(session: CustomerSession): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encryptJson(session), {
    ...baseCookieOptions,
    // Outlive the access token so a refresh is still possible after expiry.
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function writeOAuthTransaction(tx: OAuthTransaction): Promise<void> {
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, encryptJson(tx), {
    ...baseCookieOptions,
    maxAge: 60 * 10,
  });
}

export async function consumeOAuthTransaction(): Promise<OAuthTransaction | null> {
  const store = await cookies();
  const raw = store.get(OAUTH_STATE_COOKIE)?.value;
  store.delete(OAUTH_STATE_COOKIE);
  if (!raw) return null;
  return decryptJson<OAuthTransaction>(raw);
}

export async function readCartId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

export async function writeCartId(cartId: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, cartId, { ...baseCookieOptions, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearCartId(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}

/** True when the access token is expired or within the 60s refresh window. */
export function isExpired(session: CustomerSession): boolean {
  return Date.now() >= session.expiresAt - 60_000;
}
