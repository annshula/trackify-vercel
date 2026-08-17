/**
 * npm run shopify:sync-shop
 *
 * Store contact details + legal policies synchronization from Shopify into
 * data/shop.json. Idempotent — safe to run repeatedly. Separate from
 * `npm run shopify:sync` because it reads two different Shopify APIs (Admin
 * for contact, Storefront for policies) that a product-catalog sync has no
 * other reason to touch.
 */
import { colors, fatal, heading, info, success, warn } from './bootstrap';

async function revalidateRunningApp(): Promise<void> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const adminKey = process.env.ADMIN_API_KEY;

  if (!siteUrl || !adminKey) {
    info('  Skipped cache purge — set NEXT_PUBLIC_SITE_URL and ADMIN_API_KEY to enable it.');
    return;
  }

  try {
    const response = await fetch(`${siteUrl}/api/admin/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify({ shop: true, paths: ['/pages/contact', '/pages/shipping', '/pages/returns', '/pages/privacy', '/pages/terms'] }),
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      success(`Cache purged on ${siteUrl}`);
    } else if (response.status === 401) {
      warn(`Cache purge rejected (401) — ADMIN_API_KEY does not match ${siteUrl}.`);
    } else {
      warn(`Cache purge returned ${response.status} from ${siteUrl}.`);
    }
  } catch {
    info(`  No storefront answered at ${siteUrl} — restart it to pick up the new shop details.`);
  }
}

async function main(): Promise<void> {
  const { fullSyncShopContent } = await import('@/services/synchronization/sync-service');

  heading('Shopify shop details sync');

  const stats = await fullSyncShopContent({ onProgress: info });

  heading('Result');
  console.log(`  Contact email     ${colors.bold}${stats.hasContactEmail ? 'yes' : 'no'}${colors.reset}`);
  console.log(`  Contact address   ${colors.bold}${stats.hasContactAddress ? 'yes' : 'no'}${colors.reset}`);
  console.log(`  Policies found    ${colors.bold}${stats.policiesFound}/4${colors.reset}`);
  console.log(`  Duration          ${colors.bold}${(stats.durationMs / 1000).toFixed(2)}s${colors.reset}`);

  if (stats.warnings.length > 0) {
    heading(`Warnings (${stats.warnings.length})`);
    for (const warning of stats.warnings) warn(warning);
  }

  success('\ndata/shop.json written');

  await revalidateRunningApp();
}

main().catch(fatal);
