/**
 * npm run shopify:webhooks -- [--url=https://your-site.com]
 *
 * Lists existing webhook subscriptions and creates any that are missing.
 * Idempotent — an already-registered topic is left alone.
 */
import { colors, fatal, heading, info, success, warn } from "./bootstrap";

const REQUIRED_TOPICS = [
  "PRODUCTS_CREATE",
  "PRODUCTS_UPDATE",
  "PRODUCTS_DELETE",
  "COLLECTIONS_CREATE",
  "COLLECTIONS_UPDATE",
  "COLLECTIONS_DELETE",
  "INVENTORY_LEVELS_UPDATE",
  "PRODUCT_LISTINGS_ADD",
  "PRODUCT_LISTINGS_REMOVE",
  "BLOGS_CREATE",
  "BLOGS_UPDATE",
  "BLOGS_DELETE",
  "ARTICLES_CREATE",
  "ARTICLES_UPDATE",
  "ARTICLES_DELETE",
] as const;

type SubscriptionsResult = {
  webhookSubscriptions: {
    nodes: {
      id: string;
      topic: string;
      endpoint: { __typename: string; callbackUrl?: string };
    }[];
  };
};

type CreateResult = {
  webhookSubscriptionCreate: {
    webhookSubscription: { id: string; topic: string } | null;
    userErrors: { field: string[] | null; message: string }[];
  };
};

async function main(): Promise<void> {
  const { adminRequest } = await import("@/lib/shopify/admin");
  const { WEBHOOK_SUBSCRIPTIONS_QUERY, WEBHOOK_SUBSCRIPTION_CREATE_MUTATION } =
    await import("@/lib/shopify/queries/admin");

  const siteUrl = (
    process.argv
      .find((arg) => arg.startsWith("--url="))
      ?.slice("--url=".length) ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).replace(/\/+$/, "");

  if (!siteUrl || siteUrl.startsWith("http://localhost")) {
    warn(
      "Shopify cannot deliver webhooks to localhost. Pass a public URL:\n" +
        "  npm run shopify:webhooks -- --url=https://your-tunnel.example.com",
    );
    if (!siteUrl) process.exit(1);
  }

  const callbackUrl = `${siteUrl}/api/webhooks/shopify`;
  heading(`Webhook subscriptions → ${callbackUrl}`);

  const existing = await adminRequest<SubscriptionsResult>({
    query: WEBHOOK_SUBSCRIPTIONS_QUERY,
  });
  const registered = new Set(
    existing.webhookSubscriptions.nodes
      .filter((node) => node.endpoint.callbackUrl === callbackUrl)
      .map((node) => node.topic),
  );

  info(
    `  ${existing.webhookSubscriptions.nodes.length} subscription(s) currently registered on this store`,
  );

  let created = 0;
  for (const topic of REQUIRED_TOPICS) {
    if (registered.has(topic)) {
      console.log(
        `  ${colors.dim}skip${colors.reset}   ${topic} (already registered)`,
      );
      continue;
    }

    const result = await adminRequest<CreateResult>({
      query: WEBHOOK_SUBSCRIPTION_CREATE_MUTATION,
      variables: { topic, callbackUrl },
    });

    const errors = result.webhookSubscriptionCreate.userErrors;
    if (errors.length > 0) {
      console.log(
        `  ${colors.red}error${colors.reset}  ${topic}: ${errors.map((e) => e.message).join("; ")}`,
      );
      continue;
    }
    console.log(`  ${colors.green}created${colors.reset} ${topic}`);
    created += 1;
  }

  success(
    `\n${created} subscription(s) created, ${REQUIRED_TOPICS.length - created} already present.`,
  );
  info(
    "Remember: the signing secret must match SHOPIFY_WEBHOOK_SECRET in .env.local",
  );
}

main().catch(fatal);
