import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Dev-only: lets the ngrok tunnel load /_next/* without 403s.
  allowedDevOrigins: ["b349-223-178-81-28.ngrok-free.app"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "*.myshopify.com" },
      // Judge.me-hosted customer review photos/videos (services/reviews/judgeme.ts).
      { protocol: "https", hostname: "cdn.judge.me" },
      { protocol: "https", hostname: "judgeme.imgix.net" },
      // Photos on reviews written on this store (Judge.me's "web" source).
      { protocol: "https", hostname: "review-images.judgeme.com" },
      // Reviews imported from AliExpress (Judge.me's "aliexpress" source)
      // keep the original AliExpress-hosted photo URLs rather than re-hosting.
      { protocol: "https", hostname: "ae-pic-a1.aliexpress-media.com" },
      { protocol: "https", hostname: "ae01.alicdn.com" },
    ],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 200, 256, 384],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    if (!storeDomain) return [];

    return [
      {
        source: "/_t/:path*",
        destination: `https://${storeDomain}/_t/:path*`,
      },
    ];
  },
};

export default nextConfig;
