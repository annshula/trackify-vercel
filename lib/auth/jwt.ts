/**
 * Minimal JWT payload decoding — no signature verification.
 *
 * This is deliberately not a general-purpose JWT verifier. It exists for one
 * narrow purpose: reading the `nonce` claim back out of the Customer Account
 * API's id_token so it can be compared against the nonce this app generated
 * for the OAuth request, which is what actually binds the token to *this*
 * login attempt and blocks replay of a token obtained elsewhere.
 *
 * Skipping signature/issuer/audience verification is safe here because the
 * id_token is never used to establish identity or authorization in this app —
 * every customer-scoped read goes through the access_token, which Shopify
 * itself validates on every Customer Account API call. The id_token is only
 * ever used as the `id_token_hint` on logout. Treat this as a correctness
 * check, not a trust boundary.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function idTokenNonce(idToken: string): string | null {
  const claim = decodeJwtPayload(idToken)?.nonce;
  return typeof claim === 'string' ? claim : null;
}
