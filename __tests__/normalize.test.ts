import { describe, expect, it } from 'vitest';
import { normalizeCollection, normalizeProduct, type AdminProductNode } from '@/lib/catalog/normalize';
import { diffCatalogs } from '@/services/synchronization/sync-service';
import { makeCatalog, makeProduct } from './factories';

function adminProduct(overrides: Partial<AdminProductNode> = {}): AdminProductNode {
  return {
    id: 'gid://shopify/Product/1',
    handle: 'premium-watch',
    title: 'Premium Watch',
    description: 'A watch.',
    descriptionHtml: '<p>A watch.</p>',
    vendor: 'Aurelia',
    productType: 'Watches',
    tags: ['new', 'featured'],
    status: 'ACTIVE',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    publishedAt: '2025-01-01T00:00:00.000Z',
    totalInventory: 10,
    seo: { title: 'Premium Watch', description: 'Buy the premium watch.' },
    options: [{ id: 'gid://shopify/ProductOption/1', name: 'Title', position: 1, values: ['Default Title'] }],
    media: {
      nodes: [
        {
          id: 'gid://shopify/MediaImage/1',
          mediaContentType: 'IMAGE',
          alt: 'Front view',
          preview: {
            image: {
              id: 'gid://shopify/MediaImage/1',
              url: 'https://cdn.shopify.com/watch.jpg',
              width: 1200,
              height: 1500,
              altText: 'Front view',
            },
          },
        },
      ],
    },
    images: { nodes: [] },
    collections: { nodes: [{ id: 'gid://shopify/Collection/1', handle: 'watches', title: 'Watches' }] },
    metafields: {
      nodes: [
        { namespace: 'custom', key: 'material', value: 'Steel', type: 'single_line_text_field' },
        // Must be stripped — not on the public allowlist.
        { namespace: 'internal', key: 'cost', value: '12.50', type: 'number_decimal' },
      ],
    },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/1',
          title: 'Default Title',
          sku: 'PW-001',
          barcode: null,
          price: '249.00',
          compareAtPrice: '299.00',
          position: 1,
          availableForSale: true,
          inventoryQuantity: 10,
          inventoryPolicy: 'DENY',
          selectedOptions: [{ name: 'Title', value: 'Default Title' }],
          image: { id: 'gid://shopify/MediaImage/1' },
          inventoryItem: { requiresShipping: true, measurement: { weight: { value: 0.2, unit: 'KILOGRAMS' } } },
        },
      ],
    },
    publishedOnCurrentPublication: true,
    ...overrides,
  };
}

describe('product normalization', () => {
  it('preserves the Shopify handle exactly', () => {
    const product = normalizeProduct(adminProduct(), 'USD');
    expect(product.handle).toBe('premium-watch');
  });

  it('parses money strings into numbers', () => {
    const product = normalizeProduct(adminProduct(), 'USD');
    expect(product.variants[0]?.price).toBe(249);
    expect(product.variants[0]?.compareAtPrice).toBe(299);
  });

  it('drops a compare-at price that is not a real markdown', () => {
    const node = adminProduct();
    node.variants.nodes[0]!.compareAtPrice = '200.00'; // below price
    expect(normalizeProduct(node, 'USD').variants[0]?.compareAtPrice).toBeNull();
  });

  it('excludes metafields outside the public allowlist', () => {
    const product = normalizeProduct(adminProduct(), 'USD');
    expect(product.metafields['custom.material']).toBe('Steel');
    expect(product.metafields['internal.cost']).toBeUndefined();
  });

  it('builds images from the media connection', () => {
    const product = normalizeProduct(adminProduct(), 'USD');
    expect(product.images).toHaveLength(1);
    expect(product.images[0]?.url).toBe('https://cdn.shopify.com/watch.jpg');
  });

  it('clears a variant image reference that does not resolve', () => {
    const node = adminProduct();
    node.variants.nodes[0]!.image = { id: 'gid://shopify/MediaImage/missing' };
    expect(normalizeProduct(node, 'USD').variants[0]?.imageId).toBeNull();
  });

  it('computes the price range across variants', () => {
    const node = adminProduct();
    node.variants.nodes.push({
      ...node.variants.nodes[0]!,
      id: 'gid://shopify/ProductVariant/2',
      price: '399.00',
      compareAtPrice: null,
      position: 2,
    });
    const product = normalizeProduct(node, 'USD');
    expect(product.priceRange).toEqual({ min: 249, max: 399, currencyCode: 'USD' });
  });

  it('is deterministic — identical input yields identical output', () => {
    const a = normalizeProduct(adminProduct(), 'USD');
    const b = normalizeProduct(adminProduct(), 'USD');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('sorts tags so ordering noise cannot cause a false diff', () => {
    const product = normalizeProduct(adminProduct({ tags: ['zeta', 'alpha'] }), 'USD');
    expect(product.tags).toEqual(['alpha', 'zeta']);
  });

  it('treats an unknown status as DRAFT rather than trusting it', () => {
    expect(normalizeProduct(adminProduct({ status: 'WEIRD' }), 'USD').status).toBe('DRAFT');
  });

  /** Declares the metafield that points at spec/feature metaobjects by id. */
  function specMetafield(key: 'specs' | 'feature_highlights', ...ids: string[]) {
    return {
      namespace: 'custom',
      key,
      value: JSON.stringify(ids),
      type: 'list.metaobject_reference',
    };
  }

  it('resolves custom.specs and custom.feature_highlights metaobject lists', () => {
    const node = adminProduct();
    node.metafields!.nodes.push(
      specMetafield('specs', 'gid://shopify/Metaobject/1'),
      specMetafield('feature_highlights', 'gid://shopify/Metaobject/2'),
    );

    const metaobjects = new Map([
      [
        'gid://shopify/Metaobject/1',
        {
          id: 'gid://shopify/Metaobject/1',
          fields: [
            { key: 'label', value: 'Material' },
            { key: 'value', value: 'Titanium' },
            { key: 'description', value: 'Aerospace-grade, corrosion resistant.' },
            { key: 'image', value: 'gid://shopify/MediaImage/1' },
          ],
        },
      ],
      [
        'gid://shopify/Metaobject/2',
        {
          id: 'gid://shopify/Metaobject/2',
          fields: [
            { key: 'icon', value: 'fit' },
            { key: 'label', value: 'Adjustable band' },
            { key: 'body', value: "Fits any wrist without tools." },
            { key: 'image', value: null },
          ],
        },
      ],
    ]);

    const product = normalizeProduct(node, 'USD', metaobjects);

    expect(product.specs).toEqual([
      {
        label: 'Material',
        value: 'Titanium',
        description: 'Aerospace-grade, corrosion resistant.',
        image: product.images[0],
        video: null,
      },
    ]);
    expect(product.featureHighlights).toEqual([
      {
        icon: 'fit',
        label: 'Adjustable band',
        body: 'Fits any wrist without tools.',
        image: null,
        video: null,
      },
    ]);
  });

  it('resolves a spec image from the file reference even when it is not in the product media', () => {
    const node = adminProduct();
    node.metafields!.nodes.push(specMetafield('specs', 'gid://shopify/Metaobject/4'));

    const metaobjects = new Map([
      [
        'gid://shopify/Metaobject/4',
        {
          id: 'gid://shopify/Metaobject/4',
          fields: [
            { key: 'label', value: 'Finish' },
            { key: 'value', value: 'Brushed' },
            // Lives in the store's Files library, never attached to this
            // product's media — the reference is what makes it resolvable.
            {
              key: 'image',
              value: 'gid://shopify/MediaImage/999',
              reference: {
                id: 'gid://shopify/MediaImage/999',
                image: {
                  url: 'https://cdn.shopify.com/finish.jpg',
                  width: 800,
                  height: 800,
                  altText: 'Brushed finish',
                },
              },
            },
          ],
        },
      ],
    ]);

    const spec = normalizeProduct(node, 'USD', metaobjects).specs[0];
    expect(spec?.image).toEqual({
      id: 'gid://shopify/MediaImage/999',
      url: 'https://cdn.shopify.com/finish.jpg',
      altText: 'Brushed finish',
      width: 800,
      height: 800,
    });
  });

  it('resolves a spec video for an entry that has one instead of an image', () => {
    const node = adminProduct();
    node.metafields!.nodes.push(specMetafield('specs', 'gid://shopify/Metaobject/5'));

    const metaobjects = new Map([
      [
        'gid://shopify/Metaobject/5',
        {
          id: 'gid://shopify/Metaobject/5',
          fields: [
            { key: 'label', value: 'Polish' },
            { key: 'value', value: 'Hand-polished' },
            { key: 'image', value: null },
            {
              key: 'video',
              value: 'gid://shopify/Video/77',
              reference: {
                id: 'gid://shopify/Video/77',
                sources: [
                  { url: 'https://cdn.shopify.com/polish.mp4', mimeType: 'video/mp4', format: 'mp4' },
                ],
                preview: { image: { url: 'https://cdn.shopify.com/polish-poster.jpg' } },
              },
            },
          ],
        },
      ],
    ]);

    const spec = normalizeProduct(node, 'USD', metaobjects).specs[0];
    expect(spec?.image).toBeNull();
    expect(spec?.video).toEqual({
      id: 'gid://shopify/Video/77',
      sources: [
        { url: 'https://cdn.shopify.com/polish.mp4', mimeType: 'video/mp4', format: 'mp4' },
      ],
      previewUrl: 'https://cdn.shopify.com/polish-poster.jpg',
    });
  });

  it('drops a spec entry missing required fields rather than rendering a blank row', () => {
    const node = adminProduct();
    node.metafields!.nodes.push(specMetafield('specs', 'gid://shopify/Metaobject/3'));

    const metaobjects = new Map([
      [
        'gid://shopify/Metaobject/3',
        {
          id: 'gid://shopify/Metaobject/3',
          fields: [{ key: 'label', value: 'Material' }], // no `value` field
        },
      ],
    ]);

    expect(normalizeProduct(node, 'USD', metaobjects).specs).toEqual([]);
  });

  it('ignores a spec reference whose metaobject did not resolve', () => {
    const node = adminProduct();
    node.metafields!.nodes.push(specMetafield('specs', 'gid://shopify/Metaobject/missing'));

    // An empty index is what a store without `read_metaobjects` produces —
    // the catalog must still build, just without the structured specs.
    expect(normalizeProduct(node, 'USD', new Map()).specs).toEqual([]);
  });

  it('is empty when the product has no custom.specs or custom.feature_highlights metafield', () => {
    const product = normalizeProduct(adminProduct(), 'USD');
    expect(product.specs).toEqual([]);
    expect(product.featureHighlights).toEqual([]);
  });
});

describe('collection normalization', () => {
  it('records membership and sorts it', () => {
    const collection = normalizeCollection(
      {
        id: 'gid://shopify/Collection/1',
        handle: 'watches',
        title: 'Watches',
        description: '',
        descriptionHtml: '',
        updatedAt: '2025-01-02T00:00:00.000Z',
        sortOrder: 'BEST_SELLING',
        seo: { title: null, description: null },
        image: null,
      },
      ['gid://shopify/Product/2', 'gid://shopify/Product/1'],
    );

    expect(collection.productIds).toEqual(['gid://shopify/Product/1', 'gid://shopify/Product/2']);
  });
});

describe('catalog diff', () => {
  it('treats every product as added on a first sync', () => {
    const next = makeCatalog({ products: [makeProduct({ handle: 'one' })] });
    expect(diffCatalogs(null, next).added).toEqual(['one']);
  });

  it('detects a handle change as a rename, not a new product', () => {
    const before = makeProduct({ handle: 'old-handle' });
    const after = { ...before, handle: 'new-handle' };

    const diff = diffCatalogs(makeCatalog({ products: [before] }), makeCatalog({ products: [after] }));

    expect(diff.handleChanges).toEqual([
      { id: before.id, from: 'old-handle', to: 'new-handle' },
    ]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('detects removals', () => {
    const gone = makeProduct({ handle: 'gone' });
    const diff = diffCatalogs(makeCatalog({ products: [gone] }), makeCatalog({ products: [] }));
    expect(diff.removed).toEqual(['gone']);
  });

  it('reports no updates when nothing changed', () => {
    const product = makeProduct({ handle: 'stable' });
    const diff = diffCatalogs(
      makeCatalog({ products: [product] }),
      makeCatalog({ products: [product] }),
    );
    expect(diff.updated).toEqual([]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it('reports an update when a field actually changed', () => {
    const before = makeProduct({ handle: 'stable' });
    const after = { ...before, title: 'A new title' };
    expect(diffCatalogs(makeCatalog({ products: [before] }), makeCatalog({ products: [after] })).updated).toEqual([
      'stable',
    ]);
  });
});
