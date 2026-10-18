/**
 * npm run shopify:sale-end -- <ISO datetime> [handle ...] [--clear]
 *
 * Sets `custom.sale_ends_at` — the deadline behind the PDP's "Offer ends in"
 * timer — on products that are actually marked down (a variant has a
 * compare-at price above its price), or only on the handles given. `--clear`
 * removes the deadline instead. The timer hides itself the moment the deadline
 * passes, so run this again for the next sale.
 *
 *   npm run shopify:sale-end -- 2026-10-25T23:59:00Z
 *   npm run shopify:sale-end -- --clear
 *
 * Then: npm run shopify:sync
 */
import { colors, fatal, heading, info, success } from "./bootstrap";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const clear = args.includes("--clear");
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const iso = clear ? null : positional.shift();
  const handles = positional;

  if (!clear) {
    if (!iso || Number.isNaN(Date.parse(iso))) {
      fatal("Usage: npm run shopify:sale-end -- <ISO datetime, e.g. 2026-10-25T23:59:00Z> [handle ...] | --clear");
    }
    if (Date.parse(iso!) <= Date.now()) fatal("That deadline is in the past — the timer would never show.");
  }

  const { productRepository } = await import("@/lib/catalog");
  const { adminRequest } = await import("@/lib/shopify/admin");

  const products = (await productRepository.getAllProducts()).filter((product) =>
    handles.length > 0
      ? handles.includes(product.handle)
      : product.variants.some((v) => v.compareAtPrice !== null && v.compareAtPrice > v.price),
  );
  if (products.length === 0) fatal("No matching products.");

  heading(clear ? "Clearing sale deadlines" : `Sale ends ${iso}`);

  if (clear) {
    await adminRequest({
      query: /* GraphQL */ `
        mutation Clear($metafields: [MetafieldIdentifierInput!]!) {
          metafieldsDelete(metafields: $metafields) { userErrors { field message } }
        }
      `,
      variables: {
        metafields: products.map((p) => ({ ownerId: p.id, namespace: "custom", key: "sale_ends_at" })),
      },
    });
  } else {
    const data = await adminRequest<{ metafieldsSet: { userErrors: { message: string }[] } }>({
      query: /* GraphQL */ `
        mutation Set($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) { userErrors { field message } }
        }
      `,
      variables: {
        metafields: products.map((p) => ({
          ownerId: p.id,
          namespace: "custom",
          key: "sale_ends_at",
          type: "date_time",
          value: new Date(iso!).toISOString(),
        })),
      },
    });
    const errors = data.metafieldsSet.userErrors;
    if (errors.length > 0) fatal(errors.map((e) => e.message).join("; "));
  }

  for (const product of products) info(`  ${product.handle}`);
  success(`${products.length} product(s) updated`);
  console.log(`\n${colors.dim}Next: npm run shopify:sync${colors.reset}`);
}

main().catch(fatal);
