/**
 * npm run shopify:push-pdp -- <handle> [--shop]
 *
 * Pushes reviewed PDP copy from scripts/pdp-content/<handle>.ts into Shopify
 * metaobjects + product metafields, so Shopify stays the source of truth and
 * the normal `npm run shopify:sync` brings it into the catalog. `--shop` also
 * pushes the store-wide announcement / shipping / trust content.
 *
 * Idempotent: every metaobject gets a stable handle
 * (`<product>-<section>-<n>`) and is upserted, so re-running updates in place.
 * Schema (metaobject + metafield definitions) is created once in Shopify admin
 * and is not managed here — the app token has no write_metaobject_definitions.
 */
import { colors, fatal, heading, info, success } from "./bootstrap";
import type { Block, Faq, ProductPdpContent, Spec } from "./pdp-content/types";

type UserError = { field?: string[]; message: string };

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const handle = args.find((arg) => !arg.startsWith("--"));
  const withShop = args.includes("--shop");
  if (!handle && !withShop) fatal("Usage: npm run shopify:push-pdp -- <handle> [--shop]");

  const { adminRequest } = await import("@/lib/shopify/admin");

  const check = (label: string, errors: UserError[] | undefined) => {
    if (errors?.length) {
      throw new Error(`${label}: ${errors.map((e) => `${e.field?.join(".") ?? ""} ${e.message}`).join("; ")}`);
    }
  };

  async function upsert(type: string, objectHandle: string, fields: Record<string, string | undefined>): Promise<string> {
    const data = await adminRequest<{
      metaobjectUpsert: { metaobject: { id: string } | null; userErrors: UserError[] };
    }>({
      query: /* GraphQL */ `
        mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
          metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
            metaobject { id }
            userErrors { field message }
          }
        }
      `,
      variables: {
        handle: { type, handle: objectHandle },
        metaobject: {
          fields: Object.entries(fields)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => ({ key, value })),
        },
      },
    });
    check(`${type} ${objectHandle}`, data.metaobjectUpsert.userErrors);
    return data.metaobjectUpsert.metaobject!.id;
  }

  const blocks = (prefix: string, items: Block[]) =>
    Promise.all(
      items.map((block, i) =>
        upsert("feature_highlight", `${prefix}-${i + 1}`, {
          icon: block.icon,
          label: block.label,
          body: block.body,
          image: block.image,
        }),
      ),
    );
  const specs = (prefix: string, items: Spec[]) =>
    Promise.all(
      items.map((spec, i) =>
        upsert("product_spec", `${prefix}-${i + 1}`, {
          label: spec.label,
          value: spec.value,
          description: spec.description,
        }),
      ),
    );
  const faqs = (prefix: string, items: Faq[]) =>
    Promise.all(
      items.map((faq, i) =>
        upsert("faq_item", `${prefix}-${i + 1}`, { question: faq.question, answer: faq.answer }),
      ),
    );

  type MetafieldInput = { ownerId: string; namespace: string; key: string; type: string; value: string };

  async function setMetafields(metafields: MetafieldInput[]): Promise<void> {
    const toSet = metafields.filter((m) => m.value !== "" && m.value !== "[]");
    const toDelete = metafields.filter((m) => m.value === "" || m.value === "[]");

    if (toSet.length) {
      const data = await adminRequest<{ metafieldsSet: { userErrors: UserError[] } }>({
        query: /* GraphQL */ `
          mutation Set($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) { userErrors { field message } }
          }
        `,
        variables: { metafields: toSet },
      });
      check("metafieldsSet", data.metafieldsSet.userErrors);
    }
    if (toDelete.length) {
      await adminRequest({
        query: /* GraphQL */ `
          mutation Delete($metafields: [MetafieldIdentifierInput!]!) {
            metafieldsDelete(metafields: $metafields) { userErrors { field message } }
          }
        `,
        variables: {
          metafields: toDelete.map(({ ownerId, namespace, key }) => ({ ownerId, namespace, key })),
        },
      });
    }
  }

  const list = (ids: string[]) => JSON.stringify(ids);
  const ref = "list.metaobject_reference";

  if (handle) {
    heading(`Pushing PDP content for ${handle}`);
    let content: ProductPdpContent;
    try {
      ({ content } = await import(`./pdp-content/${handle}.ts`));
    } catch {
      fatal(`No content file at scripts/pdp-content/${handle}.ts`);
    }

    const lookup = await adminRequest<{ productByIdentifier: { id: string } | null }>({
      query: `query ($handle: String!) { productByIdentifier(identifier: { handle: $handle }) { id } }`,
      variables: { handle },
    });
    const ownerId = lookup.productByIdentifier?.id;
    if (!ownerId) fatal(`Product "${handle}" not found in Shopify`);

    const [benefits, story, features, how, uses, included, specIds, faqIds] = await Promise.all([
      blocks(`${handle}-benefit`, content.benefits),
      blocks(`${handle}-story`, content.story),
      blocks(`${handle}-feature`, content.featureHighlights),
      blocks(`${handle}-step`, content.howItWorks),
      blocks(`${handle}-use`, content.useCases),
      blocks(`${handle}-included`, content.whatsIncluded),
      specs(`${handle}-spec`, content.specs),
      faqs(`${handle}-faq`, content.faq),
    ]);
    info(`  Upserted ${[benefits, story, features, how, uses, included, specIds, faqIds].flat().length} metaobjects`);

    const mf = (key: string, type: string, value: string): MetafieldInput => ({ ownerId, namespace: "custom", key, type, value });
    await setMetafields([
      mf("subtitle", "single_line_text_field", content.subtitle),
      mf("cta_headline", "single_line_text_field", content.ctaHeadline),
      mf("benefits", ref, list(benefits)),
      mf("story", ref, list(story)),
      mf("feature_highlights", ref, list(features)),
      mf("how_it_works", ref, list(how)),
      mf("use_cases", ref, list(uses)),
      mf("whats_included", ref, list(included)),
      mf("specs", ref, list(specIds)),
      mf("faq", ref, list(faqIds)),
    ]);
    success(`${handle}: metafields set`);

    const alts = Object.entries(content.mediaAlt ?? {});
    if (alts.length) {
      const data = await adminRequest<{ fileUpdate: { userErrors: UserError[] } }>({
        query: /* GraphQL */ `
          mutation Alt($files: [FileUpdateInput!]!) {
            fileUpdate(files: $files) { userErrors { field message } }
          }
        `,
        variables: { files: alts.map(([id, alt]) => ({ id, alt })) },
      });
      check("fileUpdate", data.fileUpdate.userErrors);
      success(`${handle}: alt text set on ${alts.length} images`);
    }
  }

  if (withShop) {
    heading("Pushing store-wide PDP content");
    const { shopContent } = await import("./pdp-content/_shop");
    const shop = await adminRequest<{ shop: { id: string } }>({ query: `{ shop { id } }` });
    const ownerId = shop.shop.id;
    const trust = await blocks("shop-trust", shopContent.trustPoints);
    const text = (key: string, value: string): MetafieldInput => ({
      ownerId, namespace: "custom", key, type: "single_line_text_field", value,
    });
    await setMetafields([
      text("announcement", shopContent.announcement),
      text("shipping_processing_time", shopContent.shippingProcessingTime),
      text("shipping_delivery_estimate", shopContent.shippingDeliveryEstimate),
      text("shipping_cost_note", shopContent.shippingCostNote),
      text("shipping_regions", shopContent.shippingRegions),
      { ownerId, namespace: "custom", key: "trust_points", type: ref, value: list(trust) },
    ]);
    success("Shop: metafields set");
  }

  console.log(`\n${colors.dim}Next: npm run shopify:sync && npm run shopify:sync-shop${colors.reset}`);
}

main().catch(fatal);
