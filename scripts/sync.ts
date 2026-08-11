/**
 * npm run shopify:sync
 *
 * Full catalog synchronization from Shopify into data/products.json.
 * Idempotent — safe to run repeatedly.
 */
import { colors, fatal, heading, info, success, warn } from './bootstrap';

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
}

main().catch(fatal);
