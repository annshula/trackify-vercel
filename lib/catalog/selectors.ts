import type { CatalogProduct, CatalogVariant } from '@/types/catalog';

/** Pure, shared derivations used by both server and client components. */

export function defaultVariant(product: CatalogProduct): CatalogVariant | null {
  return (
    product.variants.find((variant) => variant.availableForSale) ?? product.variants[0] ?? null
  );
}

export function isSoldOut(product: CatalogProduct): boolean {
  return product.variants.every((variant) => !variant.availableForSale);
}

export function hasMarkdown(product: CatalogProduct): boolean {
  return product.variants.some(
    (variant) => variant.compareAtPrice !== null && variant.compareAtPrice > variant.price,
  );
}

/** True only when the store is genuinely close to selling out. */
export function lowStockCount(variant: CatalogVariant | null, threshold = 8): number | null {
  if (!variant || !variant.availableForSale) return null;
  if (variant.inventoryPolicy === 'CONTINUE') return null;
  if (typeof variant.inventoryQuantity !== 'number') return null;
  if (variant.inventoryQuantity <= 0 || variant.inventoryQuantity > threshold) return null;
  return variant.inventoryQuantity;
}

export function findVariantByOptions(
  product: CatalogProduct,
  selection: Record<string, string>,
): CatalogVariant | null {
  const entries = Object.entries(selection);
  if (entries.length === 0) return null;

  return (
    product.variants.find((variant) =>
      entries.every(([name, value]) =>
        variant.selectedOptions.some((option) => option.name === name && option.value === value),
      ),
    ) ?? null
  );
}

export function optionsOfVariant(variant: CatalogVariant): Record<string, string> {
  return Object.fromEntries(variant.selectedOptions.map((option) => [option.name, option.value]));
}

/**
 * Which option values can still lead to a purchasable variant, given the rest
 * of the current selection. Drives the "unavailable" styling in the picker.
 */
export function availableValuesFor(
  product: CatalogProduct,
  optionName: string,
  selection: Record<string, string>,
): Set<string> {
  const others = Object.entries(selection).filter(([name]) => name !== optionName);
  const available = new Set<string>();

  for (const variant of product.variants) {
    if (!variant.availableForSale) continue;
    const matchesOthers = others.every(([name, value]) =>
      variant.selectedOptions.some((option) => option.name === name && option.value === value),
    );
    if (!matchesOthers) continue;

    const value = variant.selectedOptions.find((option) => option.name === optionName)?.value;
    if (value) available.add(value);
  }

  return available;
}

/** Reads a rating from a metafield if the store publishes one. Never invented. */
export function productRating(product: CatalogProduct): { value: number; count: number } | null {
  const raw = product.metafields['reviews.rating'] ?? product.metafields['custom.rating'];
  const rawCount = product.metafields['reviews.rating_count'] ?? product.metafields['custom.rating_count'];
  if (!raw) return null;

  // Shopify's `rating` metafield type serializes as {"value":"4.8","scale_min":...}.
  let value: number | null = null;
  try {
    const parsed = JSON.parse(raw) as { value?: string | number };
    value = Number.parseFloat(String(parsed.value ?? raw));
  } catch {
    value = Number.parseFloat(raw);
  }
  if (!Number.isFinite(value) || value === null || value <= 0) return null;

  const count = rawCount ? Number.parseInt(rawCount, 10) : 0;
  return { value, count: Number.isFinite(count) ? count : 0 };
}

export const OPTION_IS_COLOR = /^(colour|color)$/i;

/** Best-effort CSS color for a swatch. Returns null when we cannot be sure. */
export function colorSwatch(value: string): string | null {
  const named = value.trim().toLowerCase().replace(/\s+/g, '');
  const KNOWN: Record<string, string> = {
    black: '#111111',
    white: '#f8f8f6',
    ivory: '#f5f1e6',
    cream: '#f2ead9',
    beige: '#e3d5c0',
    sand: '#d9c7ab',
    tan: '#c9a87c',
    camel: '#bb9464',
    brown: '#6f4f34',
    chocolate: '#4b2f1f',
    grey: '#8b8b88',
    gray: '#8b8b88',
    charcoal: '#3a3a38',
    silver: '#c9c9c6',
    navy: '#1c2a45',
    blue: '#2b5aa8',
    skyblue: '#89b6e2',
    teal: '#1f6f6b',
    green: '#2f6b3f',
    olive: '#6b6b3a',
    sage: '#a3b394',
    red: '#a52a2a',
    burgundy: '#5c1f2b',
    pink: '#e2a5b4',
    blush: '#f0d3d3',
    purple: '#5b3a75',
    lilac: '#b9a5d1',
    yellow: '#e0b53c',
    mustard: '#c9932a',
    orange: '#d1702a',
    gold: '#b08d3e',
    rosegold: '#c68d7d',
  };
  return KNOWN[named] ?? null;
}
