/**
 * npm run shopify:sync
 *
 * Full catalog synchronization from Shopify into data/products.json.
 * Idempotent — safe to run repeatedly.
 */
import { colors, fatal, heading, info, success, warn } from './bootstrap';

/**
 * Tells a running storefront to drop its cached catalog.
 *
 * The sync runs in its own process: it rewrites products.json and refreshes
 * its own in-memory copy, then exits. A server that is already running holds a
 * separate copy loaded at boot and has no reason to re-read the file — so
 * without this the file and the live site drift apart, and deleted variants
 * keep rendering until the next restart or ISR expiry.
 *
 * Best-effort by design: a sync run with no server up (CI, a build step, a
 * first-time setup) is completely normal and must not fail because nothing
 * answered.
 */
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
      body: JSON.stringify({ catalog: true, paths: ['/', '/collections'] }),
      // A storefront that is slow to answer should not hold up the CLI.
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
    // No server listening is the common, expected case — say so plainly rather
    // than implying something went wrong.
    info(`  No storefront answered at ${siteUrl} — restart it to pick up the new catalog.`);
  }
}

async function main(): Promise<void> {
  const { fullSync } = await import('@/services/synchronization/sync-service');

  heading('Shopify catalog sync');

  const stats = await fullSync({ onProgress: info });

  heading('Result');
  console.log(`  Products      ${colors.bold}${stats.products}${colors.reset}`);
  console.log(`  Variants      ${colors.bold}${stats.variants}${colors.reset}`);
  console.log(`  Images        ${colors.bold}${stats.images}${colors.reset}`);
  console.log(`  Collections   ${colors.bold}${stats.collections}${colors.reset}`);
  console.log(`  Duration      ${colors.bold}${(stats.durationMs / 1000).toFixed(2)}s${colors.reset}`);

  console.log(
    `\n  ${colors.green}+${stats.added.length}${colors.reset} added   ` +
      `${colors.blue}~${stats.updated.length}${colors.reset} updated   ` +
      `${colors.red}-${stats.removed.length}${colors.reset} removed   ` +
      `${colors.yellow}${stats.redirectsCreated}${colors.reset} redirects`,
  );

  const preview = (label: string, handles: string[]) => {
    if (handles.length === 0) return;
    const shown = handles.slice(0, 8).join(', ');
    const more = handles.length > 8 ? ` … +${handles.length - 8} more` : '';
    info(`  ${label}: ${shown}${more}`);
  };
  preview('added', stats.added);
  preview('updated', stats.updated);
  preview('removed', stats.removed);

  if (stats.warnings.length > 0) {
    heading(`Warnings (${stats.warnings.length})`);
    for (const warning of stats.warnings.slice(0, 20)) warn(warning);
    if (stats.warnings.length > 20) info(`  … and ${stats.warnings.length - 20} more`);
  }

  success('\ndata/products.json written');

  await revalidateRunningApp();
}

main().catch(fatal);
