import type { Metadata } from "next";
import type { CatalogCollection, CatalogProduct } from "@/types/catalog";
import type { Blog, BlogArticle } from "@/types/blog";
import { publicEnv } from "@/lib/validation/env";
import { shopifyImageUrl } from "@/lib/utils/image";

const SITE_NAME = publicEnv.siteName;
const SITE_URL = publicEnv.siteUrl;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ");
}

/** Default 1200×630 social preview — the static asset at public/opengraph.png. */
const defaultOpenGraphImage = {
  url: absoluteUrl("/opengraph.png"),
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — Smart. Secure. Seamless.`,
};

/**
 * Explicit og:image for any page that has no catalog photo of its own. Spread
 * into a page's `openGraph` block (a page-level openGraph replaces the parent's
 * wholesale, so the shared image must be restated there).
 */
export const siteOpenGraphImage = { images: [defaultOpenGraphImage] };

/** Raw URL form — used by twitter.images and any direct meta references. */
export const siteOpenGraphImageUrl = defaultOpenGraphImage.url;

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Smart. Secure. Seamless.`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Smart, secure, seamless everyday carry — trackers, wallets and EDC essentials built to last. Fast delivery, easy returns, every order tracked.",
  applicationName: SITE_NAME,
  referrer: "strict-origin-when-cross-origin",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false, address: false, email: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: SITE_URL,
    // Explicit og:image — previously this relied on the file-based
    // app/opengraph-image.tsx convention, which SEO auditors flag as an
    // "inferred" property. public/opengraph.png is referenced directly so the
    // tag is explicit and stable. Product/collection pages override this with
    // their own real catalog photo (a page-level openGraph replaces this whole
    // block); pages that restate openGraph spread in siteOpenGraphImage.
    ...siteOpenGraphImage,
  },
  twitter: {
    card: "summary_large_image",
    images: [siteOpenGraphImageUrl],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical: "/" },
};

export function productMetadata(product: CatalogProduct): Metadata {
  const title = product.seo.title?.trim() || product.title;
  const description = truncate(
    product.seo.description?.trim() ||
      product.description ||
      `${product.title}${product.vendor ? ` by ${product.vendor}` : ""}. Available now at ${SITE_NAME}.`,
  );
  const url = absoluteUrl(`/products/${product.handle}`);
  const image = product.images[0];

  return {
    title,
    description,
    // Canonical always points at the current handle, never at a redirected one.
    alternates: { canonical: `/products/${product.handle}` },
    openGraph: {
      type: "website",
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
      card: "summary_large_image",
      title,
      description,
      images: image
        ? [shopifyImageUrl(image.url, { width: 1200, height: 1200 })]
        : undefined,
    },
    other: {
      "product:brand": product.vendor,
      "product:price:amount": String(product.priceRange.min),
      "product:price:currency": product.priceRange.currencyCode,
      "product:availability": product.variants.some(
        (variant) => variant.availableForSale,
      )
        ? "in stock"
        : "out of stock",
    },
  };
}

export function collectionMetadata(
  collection: CatalogCollection,
  productCount: number,
): Metadata {
  const title = collection.seo.title?.trim() || collection.title;
  const description = truncate(
    collection.seo.description?.trim() ||
      collection.description ||
      `Shop ${productCount} piece${productCount === 1 ? "" : "s"} in ${collection.title} at ${SITE_NAME}.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/collections/${collection.handle}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(`/collections/${collection.handle}`),
      siteName: SITE_NAME,
      images: collection.image
        ? [
            {
              url: shopifyImageUrl(collection.image.url, {
                width: 1200,
                height: 630,
              }),
              width: 1200,
              height: 630,
            },
          ]
        : undefined,
    },
  };
}

export function articleMetadata(article: BlogArticle): Metadata {
  const description = truncate(
    stripHtml(article.excerptHtml) ||
      stripHtml(article.bodyHtml) ||
      `${article.title} — ${SITE_NAME}`,
  );
  const url = absoluteUrl(`/blogs/${article.blogHandle}/${article.handle}`);

  return {
    title: article.title,
    description,
    alternates: { canonical: `/blogs/${article.blogHandle}/${article.handle}` },
    openGraph: {
      type: "article",
      title: article.title,
      description,
      url,
      siteName: SITE_NAME,
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt ?? undefined,
      authors: article.authorName ? [article.authorName] : undefined,
      images: article.image
        ? [
            {
              url: shopifyImageUrl(article.image.url, { width: 1200, height: 630 }),
              width: 1200,
              height: 630,
              alt: article.image.altText ?? article.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.image ? [shopifyImageUrl(article.image.url, { width: 1200, height: 630 })] : undefined,
    },
  };
}

export function blogMetadata(blog: Blog): Metadata {
  return {
    title: blog.title,
    description: `Read the latest from ${blog.title} at ${SITE_NAME}.`,
    alternates: { canonical: `/blogs/${blog.handle}` },
    openGraph: {
      type: "website",
      title: blog.title,
      url: absoluteUrl(`/blogs/${blog.handle}`),
      siteName: SITE_NAME,
    },
  };
}

/** Search and account pages must never be indexed. */
export const noIndex: Metadata["robots"] = { index: false, follow: true };
