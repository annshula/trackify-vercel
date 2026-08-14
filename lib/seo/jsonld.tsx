import type { CatalogCollection, CatalogProduct } from '@/types/catalog';
import type { BlogArticle } from '@/types/blog';
import { publicEnv } from '@/lib/validation/env';
import { productRating } from '@/lib/catalog/selectors';
import { absoluteUrl } from './metadata';

/**
 * Structured data.
 *
 * Every field is derived from real catalog data. AggregateRating is emitted
 * only when the store actually publishes review data — inventing it would be
 * a Google structured-data violation as well as a lie to the customer.
 */

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped for the one sequence that can break out.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${publicEnv.siteUrl}/#organization`,
    name: publicEnv.siteName,
    url: publicEnv.siteUrl,
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${publicEnv.siteUrl}/#website`,
    name: publicEnv.siteName,
    url: publicEnv.siteUrl,
    publisher: { '@id': `${publicEnv.siteUrl}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${publicEnv.siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function productSchema(product: CatalogProduct) {
  const url = absoluteUrl(`/products/${product.handle}`);
  const inStock = product.variants.some((variant) => variant.availableForSale);
  const rating = productRating(product);

  const offers = product.variants.map((variant) => ({
    '@type': 'Offer',
    url: `${url}?variant=${encodeURIComponent(variant.id.split('/').pop() ?? '')}`,
    priceCurrency: variant.currencyCode,
    price: variant.price.toFixed(2),
    availability: variant.availableForSale
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
    ...(variant.sku ? { sku: variant.sku } : {}),
    ...(variant.selectedOptions.length > 0 && variant.title !== 'Default Title'
      ? { name: variant.title }
      : {}),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.title,
    description: product.seo.description || product.description || product.title,
    url,
    image: product.images.slice(0, 8).map((image) => image.url),
    ...(product.vendor ? { brand: { '@type': 'Brand', name: product.vendor } } : {}),
    ...(product.productType ? { category: product.productType } : {}),
    ...(product.variants[0]?.sku ? { sku: product.variants[0].sku } : {}),
    ...(product.variants[0]?.barcode ? { gtin: product.variants[0].barcode } : {}),
    offers:
      offers.length === 1
        ? offers[0]
        : {
            '@type': 'AggregateOffer',
            priceCurrency: product.priceRange.currencyCode,
            lowPrice: product.priceRange.min.toFixed(2),
            highPrice: product.priceRange.max.toFixed(2),
            offerCount: offers.length,
            availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            offers,
          },
    // Omitted entirely when the store publishes no rating metafield.
    ...(rating && rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating.value.toFixed(1),
            reviewCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

export function articleSchema(article: BlogArticle) {
  const url = absoluteUrl(`/blogs/${article.blogHandle}/${article.handle}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: article.title,
    url,
    datePublished: article.publishedAt ?? article.createdAt,
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    ...(article.authorName ? { author: { '@type': 'Person', name: article.authorName } } : {}),
    ...(article.image ? { image: [article.image.url] } : {}),
    publisher: { '@id': `${publicEnv.siteUrl}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}

export function faqSchema(entries: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };
}

export function collectionSchema(collection: CatalogCollection, products: CatalogProduct[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: collection.seo.description || collection.description || collection.title,
    url: absoluteUrl(`/collections/${collection.handle}`),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/products/${product.handle}`),
        name: product.title,
      })),
    },
  };
}
