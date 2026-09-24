/**
 * npm run shopify:organize [-- --dry-run]
 *
 * Applies scripts/catalog-structure.ts to Shopify: sets each listed product's
 * product type, then creates (or updates) one automated collection per
 * category with the rule "product type equals <title>". Idempotent — safe to
 * re-run after editing the structure file.
 *
 * Then retires RETIRED_COLLECTIONS (delete in Shopify + record a redirect to
 * the replacing category) and renames KEPT_COLLECTIONS.
 */
import { colors, fatal, heading, info, success, warn } from "./bootstrap";
import { CATEGORIES, KEPT_COLLECTIONS, RETIRED_COLLECTIONS } from "./catalog-structure";

type UserError = { field?: string[] | null; message: string };

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const { adminRequest } = await import("@/lib/shopify/admin");

  const check = (label: string, errors: UserError[] | undefined) => {
    if (errors?.length) throw new Error(`${label}: ${errors.map((e) => e.message).join("; ")}`);
  };

  heading(`Organising catalog into ${CATEGORIES.length} categories${dryRun ? " (dry run)" : ""}`);

  for (const category of CATEGORIES) {
    // 1. Product types
    let coverImage: { src: string; altText: string } | null = null;
    for (const handle of category.products) {
      const found = await adminRequest<{
        productByIdentifier: {
          id: string;
          productType: string;
          featuredMedia: { preview: { image: { url: string } | null } | null } | null;
        } | null;
      }>({
        query: `query ($handle: String!) { productByIdentifier(identifier: { handle: $handle }) { id productType featuredMedia { preview { image { url } } } } }`,
        variables: { handle },
      });
      const product = found.productByIdentifier;
      if (!product) {
        warn(`  ${handle}: not found in Shopify — skipped`);
        continue;
      }
      const url = product.featuredMedia?.preview?.image?.url;
      if (!coverImage && url) coverImage = { src: url, altText: category.title };

      if (product.productType === category.title) continue;
      info(`  ${handle}: "${product.productType || "—"}" → "${category.title}"`);
      if (dryRun) continue;
      const updated = await adminRequest<{ productUpdate: { userErrors: UserError[] } }>({
        query: `mutation ($product: ProductUpdateInput!) { productUpdate(product: $product) { userErrors { field message } } }`,
        variables: { product: { id: product.id, productType: category.title } },
      });
      check(`productUpdate ${handle}`, updated.productUpdate.userErrors);
    }

    // 2. Automated collection
    const existing = await adminRequest<{
      collectionByIdentifier: { id: string; ruleSet: { rules: unknown[] } | null; image: { url: string } | null } | null;
    }>({
      query: `query ($handle: String!) { collectionByIdentifier(identifier: { handle: $handle }) { id ruleSet { rules { column } } image { url } } }`,
      variables: { handle: category.handle },
    });
    const current = existing.collectionByIdentifier;

    const input = {
      title: category.title,
      descriptionHtml: `<p>${category.description}</p>`,
      sortOrder: "BEST_SELLING",
      ruleSet: {
        appliedDisjunctively: false,
        rules: [{ column: "TYPE", relation: "EQUALS", condition: category.title }],
      },
      // Only set a cover on creation or when missing, so a merchant-chosen image is never replaced.
      ...(coverImage && !current?.image ? { image: coverImage } : {}),
    };

    if (current && !current.ruleSet) {
      warn(`  /collections/${category.handle} exists as a manual collection — left unchanged`);
      continue;
    }
    if (dryRun) {
      info(`  would ${current ? "update" : "create"} /collections/${category.handle}`);
      continue;
    }
    if (current) {
      const res = await adminRequest<{ collectionUpdate: { userErrors: UserError[] } }>({
        query: `mutation ($input: CollectionInput!) { collectionUpdate(input: $input) { userErrors { field message } } }`,
        variables: { input: { id: current.id, ...input } },
      });
      check(`collectionUpdate ${category.handle}`, res.collectionUpdate.userErrors);
    } else {
      const res = await adminRequest<{ collectionCreate: { userErrors: UserError[] } }>({
        query: `mutation ($input: CollectionInput!) { collectionCreate(input: $input) { userErrors { field message } } }`,
        variables: { input: { handle: category.handle, ...input } },
      });
      check(`collectionCreate ${category.handle}`, res.collectionCreate.userErrors);
    }
    success(`${category.title} → /collections/${category.handle} (${category.products.length} products)`);
  }

  heading("Retiring replaced collections");
  const { redirectRepository } = await import("@/lib/catalog");
  const lookup = async (handle: string) =>
    (
      await adminRequest<{ collectionByIdentifier: { id: string; title: string } | null }>({
        query: `query ($handle: String!) { collectionByIdentifier(identifier: { handle: $handle }) { id title } }`,
        variables: { handle },
      })
    ).collectionByIdentifier;

  for (const [oldHandle, newHandle] of Object.entries(RETIRED_COLLECTIONS)) {
    const collection = await lookup(oldHandle);
    if (dryRun) {
      info(`  would ${collection ? "delete" : "skip (already gone)"} /collections/${oldHandle} → /collections/${newHandle}`);
      continue;
    }
    if (collection) {
      const res = await adminRequest<{ collectionDelete: { userErrors: UserError[] } }>({
        query: `mutation ($input: CollectionDeleteInput!) { collectionDelete(input: $input) { userErrors { field message } } }`,
        variables: { input: { id: collection.id } },
      });
      check(`collectionDelete ${oldHandle}`, res.collectionDelete.userErrors);
    }
    // Recorded even when already deleted, so a re-run repairs a missing redirect.
    await redirectRepository.record("collections", oldHandle, newHandle);
    success(
      `${collection ? `Deleted "${collection.title}"` : "Already gone"}: /collections/${oldHandle} → /collections/${newHandle}`,
    );
  }

  for (const [handle, title] of Object.entries(KEPT_COLLECTIONS)) {
    const collection = await lookup(handle);
    if (!collection || collection.title === title) continue;
    if (dryRun) {
      info(`  would rename "${collection.title}" → "${title}"`);
      continue;
    }
    const res = await adminRequest<{ collectionUpdate: { userErrors: UserError[] } }>({
      query: `mutation ($input: CollectionInput!) { collectionUpdate(input: $input) { userErrors { field message } } }`,
      variables: { input: { id: collection.id, title } },
    });
    check(`collectionUpdate ${handle}`, res.collectionUpdate.userErrors);
    success(`Renamed "${collection.title}" → "${title}"`);
  }

  console.log(`\n${colors.dim}Next: npm run shopify:sync${colors.reset}`);
}

main().catch(fatal);
