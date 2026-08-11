import type { MetadataRoute } from 'next';
import { publicEnv } from '@/lib/validation/env';

export default function robots(): MetadataRoute.Robots {
  const base = publicEnv.siteUrl;
  // A preview deployment must never be indexed alongside production.
  const isProduction = process.env.NODE_ENV === 'production' && !base.includes('localhost');

  if (!isProduction) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/account/',
          '/cart',
          '/search',
          '/wishlist',
          // Faceted URLs are near-duplicates; the unfiltered listing is canonical.
          '/*?*sort=',
          '/*?*type=',
          '/*?*vendor=',
          '/*?*tag=',
          '/*?*min=',
          '/*?*max=',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
