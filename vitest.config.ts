import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    // Set before any module loads: several modules (publicEnv, serverEnv) read
    // process.env at import time, so a beforeAll hook would be too late.
    env: {
      SHOPIFY_STORE_DOMAIN: 'test-store.myshopify.com',
      SHOPIFY_API_VERSION: '2025-10',
      SHOPIFY_ADMIN_API_TOKEN: 'shpat_test_token_0000000000000000',
      SHOPIFY_STOREFRONT_API_TOKEN: 'storefront_test_token_000000',
      SHOPIFY_WEBHOOK_SECRET: 'test-webhook-secret',
      SESSION_SECRET: 'a'.repeat(64),
      ADMIN_API_KEY: 'test-admin-key',
      NEXT_PUBLIC_SITE_URL: 'https://example.test',
      NEXT_PUBLIC_SITE_NAME: 'Trackify',
    },
    // Catalog tests write to a temp dir; running files in parallel would let
    // them race on the same paths.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname),
      // `server-only` throws when imported outside a React Server Component
      // bundle. Under Vitest these modules run in plain Node, so it is stubbed.
      'server-only': path.resolve(import.meta.dirname, '__tests__/stubs/server-only.ts'),
    },
  },
});
