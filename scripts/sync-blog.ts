/**
 * npm run shopify:sync-blog
 *
 * Full blog/article synchronization from Shopify into data/blog.json.
 * Idempotent — safe to run repeatedly. Separate from `npm run shopify:sync`
 * because blog content requires the `read_content` Admin API scope, which a
 * store may not have granted — this must fail on its own, not take the
 * product catalog sync down with it.
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
      body: JSON.stringify({ blog: true, paths: ['/blogs'] }),
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
    info(`  No storefront answered at ${siteUrl} — restart it to pick up the new blog content.`);
  }
}

async function main(): Promise<void> {
  const { fullSyncBlogContent } = await import('@/services/synchronization/sync-service');

  heading('Shopify blog sync');

  const stats = await fullSyncBlogContent({ onProgress: info });

  heading('Result');
  console.log(`  Blogs         ${colors.bold}${stats.blogs}${colors.reset}`);
  console.log(`  Articles      ${colors.bold}${stats.articles}${colors.reset}`);
  console.log(`  Duration      ${colors.bold}${(stats.durationMs / 1000).toFixed(2)}s${colors.reset}`);

  console.log(
    `\n  ${colors.green}+${stats.added.length}${colors.reset} added   ` +
      `${colors.blue}~${stats.updated.length}${colors.reset} updated   ` +
      `${colors.red}-${stats.removed.length}${colors.reset} removed`,
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

  success('\ndata/blog.json written');

  await revalidateRunningApp();
}

main().catch(fatal);
