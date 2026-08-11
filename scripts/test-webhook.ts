/**
 * npm run shopify:test-webhook -- [topic] [--url=...] [--id=...] [--bad-hmac]
 *
 * Signs a realistic payload with SHOPIFY_WEBHOOK_SECRET and posts it to the
 * webhook endpoint, so the whole path (HMAC → dedupe → handler → revalidate)
 * can be exercised locally without waiting for a real Shopify event.
 */
import { createHmac, randomUUID } from 'node:crypto';
import { colors, fatal, heading, info, success, fail, warn } from './bootstrap';

type Args = { topic: string; url: string; id: string; badHmac: boolean; repeat: number };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const positional = argv.filter((arg) => !arg.startsWith('--'));
  const flag = (name: string): string | undefined =>
    argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

  return {
    topic: positional[0] ?? 'products/update',
    url: flag('url') ?? `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/webhooks/shopify`,
    id: flag('id') ?? '',
    badHmac: argv.includes('--bad-hmac'),
    repeat: Number.parseInt(flag('repeat') ?? '1', 10) || 1,
  };
}

function buildPayload(topic: string, id: string): Record<string, unknown> {
  const numericId = id.replace(/\D/g, '') || '1234567890';
  switch (topic) {
    case 'inventory_levels/update':
      return { inventory_item_id: Number(numericId), location_id: 1, available: 7, updated_at: new Date().toISOString() };
    case 'collections/create':
    case 'collections/update':
    case 'collections/delete':
      return { id: Number(numericId), title: 'Test collection', updated_at: new Date().toISOString() };
    default:
      return {
        id: Number(numericId),
        title: 'Test product',
        handle: 'test-product',
        updated_at: new Date().toISOString(),
      };
  }
}

async function main(): Promise<void> {
  const args = parseArgs();
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const shopDomain = (process.env.SHOPIFY_STORE_DOMAIN || '').replace(/^https?:\/\//, '');

  if (!secret) {
    fail('SHOPIFY_WEBHOOK_SECRET is not set in .env.local — cannot sign a test webhook.');
    process.exit(1);
  }

  heading(`Test webhook → ${args.url}`);
  info(`  topic ${args.topic}`);
  if (args.badHmac) warn('Sending a deliberately INVALID signature — expect 401');

  const body = JSON.stringify(buildPayload(args.topic, args.id));
  const signature = args.badHmac
    ? Buffer.from('not-a-valid-signature-not-a-valid-sig').toString('base64')
    : createHmac('sha256', secret).update(body, 'utf8').digest('base64');

  // A fixed id across repeats is what proves the dedupe cache works.
  const webhookId = randomUUID();

  for (let attempt = 1; attempt <= args.repeat; attempt += 1) {
    const started = Date.now();
    let response: Response;
    try {
      response = await fetch(args.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Topic': args.topic,
          'X-Shopify-Hmac-Sha256': signature,
          'X-Shopify-Shop-Domain': shopDomain,
          'X-Shopify-Webhook-Id': webhookId,
          'X-Shopify-API-Version': process.env.SHOPIFY_API_VERSION || '2025-10',
        },
        body,
      });
    } catch (error) {
      fail(`Request failed: ${(error as Error).message}`);
      info('  Is the dev server running? `npm run dev`');
      process.exit(1);
    }

    const text = await response.text();
    const elapsed = Date.now() - started;
    const color = response.ok ? colors.green : colors.red;
    console.log(
      `  ${color}${response.status}${colors.reset} in ${elapsed}ms` +
        (args.repeat > 1 ? `  (attempt ${attempt}/${args.repeat})` : ''),
    );
    console.log(`  ${colors.dim}${text.slice(0, 400)}${colors.reset}`);
  }

  if (args.badHmac) {
    success('Done — a 401 above means signature verification is working.');
  } else if (args.repeat > 1) {
    success('Done — the second response should report "deduped": true.');
  } else {
    success('Done');
  }
}

main().catch(fatal);
