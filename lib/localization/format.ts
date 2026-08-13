/**
 * Formatting helpers for real Shopify localization data.
 *
 * The currency name comes from the JS platform's own ICU locale database
 * (the same source `Intl.NumberFormat` already uses elsewhere in this app
 * for currency symbols), not a hand-maintained list that could drift from
 * what Shopify actually sent. (Flags are drawn as SVG in
 * components/localization/flag-icon.tsx rather than emoji, since flag emoji
 * rendering isn't reliable across browsers/fonts.)
 */

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });

export function currencyDisplayName(isoCurrencyCode: string): string {
  try {
    return currencyNames.of(isoCurrencyCode) ?? isoCurrencyCode;
  } catch {
    return isoCurrencyCode;
  }
}
