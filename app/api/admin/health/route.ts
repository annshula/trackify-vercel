import { NextResponse } from 'next/server';
import { isAuthorizedAdminRequest, unauthorizedResponse } from '@/lib/admin/auth';
import { productRepository } from '@/lib/catalog';
import { adminRequest } from '@/lib/shopify/admin';
import { SHOP_QUERY } from '@/lib/shopify/queries/admin';
import { isCustomerAccountConfigured } from '@/lib/shopify/customer-account';
import { serverEnv } from '@/lib/validation/env';
import { auditCatalog, catalogSchema } from '@/lib/catalog/schema';
import { readJsonFile, CATALOG_PATH } from '@/lib/catalog/storage';
import type { Catalog } from '@/types/catalog';

/**
 * GET /api/admin/health
 *
 * Merchant diagnostics: is Shopify reachable, is the catalog valid, how stale
 * is it, and which integrations are configured. Never reports a secret value —
 * only whether one is present.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  if (!isAuthorizedAdminRequest(request)) return unauthorizedResponse();

  const started = Date.now();
  const env = serverEnv();

  const checks: Record<string, unknown> = {
    storeDomain: env.storeDomain,
    apiVersion: env.apiVersion,
    configured: {
      adminApi: Boolean(env.adminToken),
      storefrontApi: Boolean(env.storefrontToken),
      customerAccountApi: isCustomerAccountConfigured(),
      webhookSecret: Boolean(env.webhookSecret),
      sessionSecret: Boolean(env.sessionSecret),
    },
  };

  // ── Shopify reachability ──────────────────────────────────────────────
  try {
    const shopStarted = Date.now();
    const data = await adminRequest<{ shop: { name: string; currencyCode: string } }>({
      query: SHOP_QUERY,
      retries: 1,
      timeoutMs: 8000,
    });
    checks.shopify = {
      ok: true,
      shop: data.shop.name,
      currency: data.shop.currencyCode,
      latencyMs: Date.now() - shopStarted,
    };
  } catch (error) {
    checks.shopify = { ok: false, error: (error as Error).message };
  }

  // ── Catalog integrity ─────────────────────────────────────────────────
  try {
    const meta = await productRepository.getCatalogMeta();
    const products = await productRepository.getAllProducts({ includeUnavailable: true });
    const collections = await productRepository.getAllCollections();

    const generatedAt = new Date(meta.generatedAt);
    const ageMs = Date.now() - generatedAt.getTime();

    const raw = await readJsonFile<Catalog>(CATALOG_PATH);
    const parsed = raw ? catalogSchema.safeParse(raw) : null;
    const auditIssues = parsed?.success ? auditCatalog(parsed.data) : [];

    checks.catalog = {
      ok: parsed?.success ?? false,
      generatedAt: meta.generatedAt,
      ageHours: Number.isFinite(ageMs) ? Math.round(ageMs / 3_600_000) : null,
      // A catalog older than a day means the webhook path is probably broken.
      stale: ageMs > 24 * 3_600_000,
      products: products.length,
      publishedProducts: products.filter((p) => p.status === 'ACTIVE' && p.publishedOnline).length,
      variants: products.reduce((sum, product) => sum + product.variants.length, 0),
      collections: collections.length,
      schemaValid: parsed?.success ?? false,
      auditIssueCount: auditIssues.length,
      auditIssues: auditIssues.slice(0, 10),
    };
  } catch (error) {
    checks.catalog = { ok: false, error: (error as Error).message };
  }

  const shopifyOk = (checks.shopify as { ok: boolean }).ok;
  const catalogOk = (checks.catalog as { ok: boolean }).ok;
  const status = shopifyOk && catalogOk ? 200 : 503;

  return NextResponse.json(
    { status: status === 200 ? 'healthy' : 'degraded', checkedInMs: Date.now() - started, ...checks },
    { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
  );
}
