import Link from 'next/link';
import type { CatalogProduct } from '@/types/catalog';
import { Accordion, type AccordionItem } from '@/components/ui/accordion';

/**
 * Description, specifications, shipping and returns.
 *
 * Everything is sourced from the product's own data or from store-wide policy
 * copy — nothing is generated per product. Sections with no real content are
 * omitted rather than filled with placeholder text.
 */
export function ProductDetails({ product }: { product: CatalogProduct }) {
  const items: AccordionItem[] = [];

  if (product.descriptionHtml.trim()) {
    items.push({
      id: 'description',
      title: 'Description',
      defaultOpen: true,
      content: (
        <div
          className="prose-product"
          // Shopify sanitizes rich-text product descriptions on ingest.
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      ),
    });
  }

  const specs = collectSpecifications(product);
  if (specs.length > 0) {
    items.push({
      id: 'specifications',
      title: 'Specifications',
      content: (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {specs.map((spec) => (
            <div key={spec.label} className="flex justify-between gap-4 border-b border-line pb-2">
              <dt className="text-ink-subtle">{spec.label}</dt>
              <dd className="text-right font-medium text-ink">{spec.value}</dd>
            </div>
          ))}
        </dl>
      ),
    });
  }

  items.push({
    id: 'shipping',
    title: 'Shipping & delivery',
    content: (
      <div className="space-y-3">
        <p>
          Delivery options, rates and estimated dates are calculated at checkout using
          your address. You will see the exact cost before you pay.
        </p>
        <p>
          Once your order ships, tracking appears in{' '}
          <Link href="/account/orders" className="text-ink underline underline-offset-4">
            your order history
          </Link>
          .
        </p>
      </div>
    ),
  });

  items.push({
    id: 'returns',
    title: 'Returns',
    content: (
      <p>
        Not right? Start a return from your order history. See our{' '}
        <Link href="/pages/returns" className="text-ink underline underline-offset-4">
          full returns policy
        </Link>{' '}
        for timeframes and conditions.
      </p>
    ),
  });

  return (
    <section aria-labelledby="details-heading" className="mt-14">
      <h2 id="details-heading" className="sr-only">
        Product details
      </h2>
      <Accordion items={items} />
    </section>
  );
}

type Spec = { label: string; value: string };

/**
 * Specifications from real product data: physical attributes plus any
 * allowlisted `specs.*` metafields the merchant maintains.
 */
function collectSpecifications(product: CatalogProduct): Spec[] {
  const specs: Spec[] = [];

  if (product.productType) specs.push({ label: 'Type', value: product.productType });
  if (product.vendor) specs.push({ label: 'Brand', value: product.vendor });

  const variant = product.variants[0];
  if (variant?.weight && variant.weightUnit) {
    specs.push({ label: 'Weight', value: `${variant.weight} ${variant.weightUnit.toLowerCase()}` });
  }

  for (const option of product.options) {
    if (option.values.length > 1 && option.values[0] !== 'Default Title') {
      specs.push({ label: `Available ${option.name.toLowerCase()}s`, value: option.values.join(', ') });
    }
  }

  for (const [key, value] of Object.entries(product.metafields)) {
    if (!key.startsWith('specs.')) continue;
    const label = key
      .slice('specs.'.length)
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
    // Structured metafields serialize as JSON; only render the plain ones.
    if (value.startsWith('{') || value.startsWith('[')) continue;
    specs.push({ label, value });
  }

  return specs;
}
