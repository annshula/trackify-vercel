/**
 * npm run shopify:rating -- <count> <handle ...>
 *
 * Sets the `reviews.rating_count` metafield — the review total every rating
 * badge reads (product cards, home spotlight, JSON-LD, PDP buy box). The
 * average star value lives in `reviews.rating` and is left untouched here.
 *
 *   npm run shopify:rating -- 10435 rfid-enabled-card-holder
 *
 * Then: npm run shopify:sync
 */
import { colors, fatal, heading, info, success } from "./bootstrap";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const rawCount = args.shift();
  const handles = args;

  const count = Number.parseInt(rawCount ?? "", 10);
  if (!rawCount || !Number.isInteger(count) || count <= 0) {
    fatal("Usage: npm run shopify:rating -- <positive integer> <handle ...>");
  }
  if (handles.length === 0) fatal("Give at least one product handle.");

  const { productRepository } = await import("@/lib/catalog");
  const { adminRequest } = await import("@/lib/shopify/admin");

  const products = (await productRepository.getAllProducts()).filter(
    (product) => handles.includes(product.handle),
  );
  const missing = handles.filter(
    (handle) => !products.some((product) => product.handle === handle),
  );
  if (missing.length > 0) fatal(`Unknown handle(s): ${missing.join(", ")}`);

  heading(`Rating count → ${count}`);

  const data = await adminRequest<{
    metafieldsSet: { userErrors: { field: string[]; message: string }[] };
  }>({
    query: /* GraphQL */ `
      mutation Set($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      metafields: products.map((product) => ({
        ownerId: product.id,
        namespace: "reviews",
        key: "rating_count",
        type: "number_integer",
        value: String(count),
      })),
    },
  });

  const errors = data.metafieldsSet.userErrors;
  if (errors.length > 0) fatal(errors.map((error) => error.message).join("; "));

  for (const product of products) info(`  ${product.handle}`);
  success(`${products.length} product(s) updated`);
  console.log(`\n${colors.dim}Next: npm run shopify:sync${colors.reset}`);
}

main().catch(fatal);
