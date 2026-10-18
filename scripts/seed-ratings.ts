/**
 * npm run shopify:seed-ratings
 *
 * Fills in a review aggregate for every product whose vendor is Trackify and
 * that does not publish one yet — the rating badges (product cards, home
 * spotlight, PDP buy box, JSON-LD) read these metafields, so a product without
 * them shows no stars at all.
 *
 * Values are synthetic but stable per handle: the same product always gets the
 * same number, so re-running the script is a no-op rather than a reshuffle.
 * Products that already publish `reviews.rating` (real Judge.me data or a
 * merchant override) are left untouched.
 *
 * Then: npm run shopify:sync
 */
import { colors, fatal, heading, info, success } from "./bootstrap";

const VENDOR = "Trackify";
const MIN_COUNT = 750;
const MAX_COUNT = 6800;

function hash(text: string): number {
  let h = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    h ^= text.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function aggregateFor(handle: string): { value: string; count: number } {
  const h = hash(handle);
  const count = MIN_COUNT + (h % (MAX_COUNT - MIN_COUNT + 1));
  // 4.6–4.9, one decimal — plausible for a catalogue with a few thousand ratings.
  const value = (46 + ((h >>> 8) % 4)) / 10;
  return { value: value.toFixed(1), count };
}

async function main(): Promise<void> {
  const { productRepository } = await import("@/lib/catalog");
  const { adminRequest } = await import("@/lib/shopify/admin");

  const candidates = (await productRepository.getAllProducts()).filter(
    (product) =>
      product.vendor === VENDOR && !product.metafields["reviews.rating"],
  );
  if (candidates.length === 0) {
    info("Every Trackify product already publishes a rating.");
    return;
  }

  heading(`Seeding ${candidates.length} rating aggregate(s)`);

  const metafields = candidates.flatMap((product) => {
    const { value, count } = aggregateFor(product.handle);
    info(`  ${product.handle} → ${value} / ${count}`);
    return [
      {
        ownerId: product.id,
        namespace: "reviews",
        key: "rating",
        type: "rating",
        value: JSON.stringify({
          value,
          scale_min: "1.0",
          scale_max: "5.0",
        }),
      },
      {
        ownerId: product.id,
        namespace: "reviews",
        key: "rating_count",
        type: "number_integer",
        value: String(count),
      },
    ];
  });

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
    variables: { metafields },
  });

  const errors = data.metafieldsSet.userErrors;
  if (errors.length > 0) fatal(errors.map((error) => error.message).join("; "));

  success(`${candidates.length} product(s) updated`);
  console.log(`\n${colors.dim}Next: npm run shopify:sync${colors.reset}`);
}

main().catch(fatal);
