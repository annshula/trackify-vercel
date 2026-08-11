import type { MoneyV2 } from '@/types/commerce';

const formatterCache = new Map<string, Intl.NumberFormat>();

function formatter(currencyCode: string, locale: string, maximumFractionDigits: number): Intl.NumberFormat {
  const key = `${locale}|${currencyCode}|${maximumFractionDigits}`;
  let cached = formatterCache.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: maximumFractionDigits,
      maximumFractionDigits,
    });
    formatterCache.set(key, cached);
  }
  return cached;
}

export type FormatMoneyOptions = {
  locale?: string;
  /** Drop ".00" on whole amounts — reads better in a product grid. */
  trimZeroCents?: boolean;
};

export function formatMoney(
  amount: number | string,
  currencyCode: string,
  options: FormatMoneyOptions = {},
): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(value)) return '';

  const locale = options.locale ?? 'en-US';
  const isWhole = Math.abs(value % 1) < 1e-9;
  const digits = options.trimZeroCents && isWhole ? 0 : 2;

  try {
    return formatter(currencyCode, locale, digits).format(value);
  } catch {
    // Unknown currency code — fall back rather than throwing in a render path.
    return `${currencyCode} ${value.toFixed(digits)}`;
  }
}

export function formatMoneyV2(money: MoneyV2 | null | undefined, options?: FormatMoneyOptions): string {
  if (!money) return '';
  return formatMoney(money.amount, money.currencyCode, options);
}

export function moneyToNumber(money: MoneyV2 | null | undefined): number {
  if (!money) return 0;
  const value = Number.parseFloat(money.amount);
  return Number.isFinite(value) ? value : 0;
}

/** Whole-percent discount, or null when there is no genuine markdown. */
export function discountPercent(price: number, compareAtPrice: number | null | undefined): number | null {
  if (!compareAtPrice || compareAtPrice <= price) return null;
  const percent = Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  return percent > 0 ? percent : null;
}

export function formatPriceRange(
  min: number,
  max: number,
  currencyCode: string,
  options?: FormatMoneyOptions,
): string {
  const from = formatMoney(min, currencyCode, options);
  if (Math.abs(max - min) < 1e-9) return from;
  return `${from} – ${formatMoney(max, currencyCode, options)}`;
}
