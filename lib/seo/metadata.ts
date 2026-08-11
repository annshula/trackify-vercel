import type { Metadata } from 'next';
import type { CatalogCollection, CatalogProduct } from '@/types/catalog';
import { publicEnv } from '@/lib/validation/env';
import { shopifyImageUrl } from '@/lib/utils/image';

const SITE_NAME = publicEnv.siteName;
const SITE_URL = publicEnv.siteUrl;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Considered pieces, made to last`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    'A considered edit of pieces built to last. Fast delivery, easy returns, and every order tracked from one place.',
  applicationName: SITE_NAME,
  referrer: 'strict-origin-when-cross-origin',
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: '/' },
};

export function productMetadata(product: CatalogProduct): Metadata {
  const title = product.seo.title?.trim() || product.title;
  const description = truncate(
    product.seo.description?.trim() ||
      product.description ||
      `${product.title}${product.vendor ? ` by ${product.vendor}` : ''}. Available now at ${SITE_NAME}.`,
  );
  const url = absoluteUrl(`/products/${product.handle}`);
  const image = product.images[0];

  return {
    title,
    description,
    // Canonical always points at the current handle, never at a redirected one.
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: image
        ? [
            {
              url: shopifyImageUrl(image.url, { width: 1200, height: 1200 }),
              width: 1200,
              height: 1200,
              alt: image.altText ?? product.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [shopifyImageUrl(image.url, { width: 1200, height: 1200 })] : undefined,
    },
    other: {
      'product:brand': product.vendor,
      'product:price:amount': String(product.priceRange.min),
      'product:price:currency': product.priceRange.currencyCode,
      'product:availability': product.variants.some((variant) => variant.availableForSale)
        ? 'in stock'
        : 'out of stock',
    },
  };
}

export function collectionMetadata(collection: CatalogCollection, productCount: number): Metadata {
  const title = collection.seo.title?.trim() || collection.title;
  const description = truncate(
    collection.seo.description?.trim() ||
      collection.description ||
      `Shop ${productCount} piece${productCount === 1 ? '' : 's'} in ${collection.title} at ${SITE_NAME}.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/collections/${collection.handle}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: absoluteUrl(`/collections/${collection.handle}`),
      siteName: SITE_NAME,
      images: collection.image
        ? [{ url: shopifyImageUrl(collection.image.url, { width: 1200, height: 630 }), width: 1200, height: 630 }]
        : undefined,
    },
  };
}

/** Search and account pages must never be indexed. */
export const noIndex: Metadata['robots'] = { index: false, follow: true };
