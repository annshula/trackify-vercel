/**
 * npm run shopify:validate
 *
 * Checks data/products.json against the schema and the cross-record audit,
 * without contacting Shopify. Exits non-zero on a fatal issue so it can gate CI.
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { colors, fatal, heading, info, success, warn, fail } from './bootstrap';

async function main(): Promise<void> {
  const { catalogSchema, validateCatalog, auditCatalog } = await import('@/lib/catalog/schema');

  const catalogPath = path.join(process.cwd(), 'data', 'products.json');
  heading(`Validating ${path.relative(process.cwd(), catalogPath)}`);

  let raw: string;
  try {
    raw = await fs.readFile(catalogPath, 'utf8');
  } catch {
    fail('data/products.json not found. Run `npm run shopify:sync` first.');
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`Not valid JSON: ${(error as Error).message}`);
    process.exit(1);
  }

  const result = validateCatalog(parsed);
  if (!result.ok) {
    fail(`Schema validation failed with ${result.issues.length} issue(s):`);
    for (const issue of result.issues) console.error(`    ${issue.path}: ${issue.message}`);
    process.exit(1);
  }
  success('Schema valid');

  const catalog = catalogSchema.parse(parsed);
  const issues = auditCatalog(catalog);
  const fatalIssues = issues.filter((issue) => /Duplicate handle|Duplicate product id/.test(issue.message));

  info(`  ${catalog.products.length} products`);
  info(`  ${catalog.products.reduce((sum, p) => sum + p.variants.length, 0)} variants`);
  info(`  ${catalog.collections.length} collections`);
  info(`  generated ${catalog.generatedAt}`);

  const unpublished = catalog.products.filter((p) => p.status !== 'ACTIVE' || !p.publishedOnline);
  if (unpublished.length > 0) info(`  ${unpublished.length} product(s) not visible on the storefront`);

  const noImages = catalog.products.filter((p) => p.images.length === 0);
  if (noImages.length > 0) warn(`${noImages.length} product(s) have no images: ${noImages.slice(0, 5).map((p) => p.handle).join(', ')}`);

  if (issues.length === 0) {
    success('Audit clean');
    return;
  }

  heading(`Audit issues (${issues.length})`);
  for (const issue of issues.slice(0, 30)) {
    const isFatal = fatalIssues.includes(issue);
    console.log(`  ${isFatal ? colors.red + 'FATAL' : colors.yellow + 'warn '}${colors.reset} ${issue.path}: ${issue.message}`);
  }
  if (issues.length > 30) info(`  … and ${issues.length - 30} more`);

  if (fatalIssues.length > 0) process.exit(1);
}

main().catch(fatal);
