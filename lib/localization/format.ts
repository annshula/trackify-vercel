/**
 * Formatting helpers for real Shopify localization data.
 *
 * Neither function here invents anything: both are deterministic
 * transformations of the ISO code Shopify's own API returned — a flag emoji
 * is a fixed mapping from a 2-letter country code (the Unicode "regional
 * indicator symbol" trick), and the currency name comes from the JS
 * platform's own ICU locale database (the same source `Intl.NumberFormat`
 * already uses elsewhere in this app for currency symbols), not a
 * hand-maintained list that could drift from what Shopify actually sent.
 */

export function flagEmoji(isoCountryCode: string): string {
  const code = isoCountryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️';
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
}

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });

export function currencyDisplayName(isoCurrencyCode: string): string {
  try {
    return currencyNames.of(isoCurrencyCode) ?? isoCurrencyCode;
  } catch {
    return isoCurrencyCode;
  }
}
