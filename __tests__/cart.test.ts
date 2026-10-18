import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { makeProduct, makeVariant } from './factories';

/**
 * The bag lives in the browser; Shopify's cart exists only at checkout. These
 * tests cover the two server pieces that touch it — the checkout cart service
 * (against a mocked GraphQL transport, so no live store is needed) and the
 * catalog the bag prices itself from.
 */

const storefrontRequest = vi.fn();

vi.mock('@/lib/shopify/storefront', () => ({ storefrontRequest }));

const { CartError, createCheckoutCart, validateLines } = await import(
  '@/services/shopify/cart-service'
);
const { buildBagCatalog, MAX_BAG_QUANTITY } = await import('@/lib/cart/bag-catalog');

function rawCart(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gid://shopify/Cart/abc123',
    checkoutUrl: 'https://test-store.myshopify.com/cart/c/abc123',
    totalQuantity: 1,
    updatedAt: '2025-01-02T00:00:00.000Z',
    cost: {
      subtotalAmount: { amount: '49.99', currencyCode: 'USD' },
      totalAmount: { amount: '49.99', currencyCode: 'USD' },
      totalTaxAmount: null,
      totalDutyAmount: null,
    },
    discountCodes: [],
    discountAllocations: [],
    buyerIdentity: { email: null, customer: null, countryCode: 'US' },
    lines: {
      nodes: [
        {
          id: 'gid://shopify/CartLine/1',
          quantity: 1,
          cost: {
            totalAmount: { amount: '49.99', currencyCode: 'USD' },
            amountPerQuantity: { amount: '49.99', currencyCode: 'USD' },
            compareAtAmountPerQuantity: null,
          },
          merchandise: {
            id: 'gid://shopify/ProductVariant/1',
            title: 'Default Title',
            sku: 'SKU-1',
            availableForSale: true,
            quantityAvailable: 10,
            selectedOptions: [{ name: 'Title', value: 'Default Title' }],
            image: null,
            price: { amount: '49.99', currencyCode: 'USD' },
            compareAtPrice: null,
            product: { id: 'gid://shopify/Product/1', handle: 'test', title: 'Test', vendor: 'V' },
          },
        },
      ],
    },
    ...overrides,
  };
}

beforeEach(() => storefrontRequest.mockReset());
afterEach(() => vi.clearAllMocks());

describe('createCheckoutCart', () => {
  it('builds the cart input from lines, market, customer and attributes', async () => {
    storefrontRequest.mockResolvedValue({ cartCreate: { cart: rawCart(), userErrors: [] } });

    const cart = await createCheckoutCart({
      lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 2 }],
      country: 'CA',
      attributes: [{ key: '_fbp', value: 'fb.1.123.456' }],
      customerAccessToken: 'token-123',
    });

    expect(cart.checkoutUrl).toBe('https://test-store.myshopify.com/cart/c/abc123');
    expect(cart.lines[0]?.merchandise.product.handle).toBe('test');

    const call = storefrontRequest.mock.calls[0]![0];
    expect(call.variables.country).toBe('CA');
    expect(call.variables.input).toEqual({
      lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 2 }],
      attributes: [{ key: '_fbp', value: 'fb.1.123.456' }],
      buyerIdentity: { countryCode: 'CA', customerAccessToken: 'token-123' },
    });
  });

  it('omits attributes and buyer identity when there are none', async () => {
    storefrontRequest.mockResolvedValue({ cartCreate: { cart: rawCart(), userErrors: [] } });

    await createCheckoutCart({
      lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }],
    });

    const input = storefrontRequest.mock.calls[0]![0].variables.input;
    expect(input).toEqual({
      lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }],
    });
  });

  it("surfaces Shopify's user errors as CartError", async () => {
    storefrontRequest.mockResolvedValue({
      cartCreate: {
        cart: null,
        userErrors: [{ field: ['lines'], message: 'The merchandise is not available.', code: 'INVALID' }],
      },
    });

    await expect(
      createCheckoutCart({ lines: [{ merchandiseId: 'gid://shopify/ProductVariant/9', quantity: 1 }] }),
    ).rejects.toMatchObject({
      name: 'CartError',
      message: 'The merchandise is not available.',
      code: 'INVALID',
    });
  });

  it('fails clearly when Shopify returns no cart', async () => {
    storefrontRequest.mockResolvedValue({ cartCreate: { cart: null, userErrors: [] } });
    await expect(
      createCheckoutCart({ lines: [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }] }),
    ).rejects.toBeInstanceOf(CartError);
  });
});

describe('validateLines', () => {
  const node = (overrides: Record<string, unknown> = {}) => ({
    id: 'gid://shopify/ProductVariant/1',
    availableForSale: true,
    quantityAvailable: 10,
    product: { handle: 'test', title: 'Test' },
    ...overrides,
  });

  it('reports nothing when every line is available', async () => {
    storefrontRequest.mockResolvedValue({ nodes: [node()] });
    expect(
      await validateLines([{ variantId: 'gid://shopify/ProductVariant/1', quantity: 2 }]),
    ).toEqual([]);
  });

  it('flags an unavailable line', async () => {
    storefrontRequest.mockResolvedValue({ nodes: [node({ availableForSale: false })] });
    const issues = await validateLines([{ variantId: 'gid://shopify/ProductVariant/1', quantity: 1 }]);
    expect(issues).toEqual([
      expect.objectContaining({ reason: 'unavailable', message: 'Test is no longer available.' }),
    ]);
  });

  it('flags a variant Shopify no longer returns', async () => {
    storefrontRequest.mockResolvedValue({ nodes: [null] });
    const issues = await validateLines([{ variantId: 'gid://shopify/ProductVariant/1', quantity: 1 }]);
    expect(issues[0]?.reason).toBe('unavailable');
  });

  it('flags short stock with the quantity that is left', async () => {
    storefrontRequest.mockResolvedValue({ nodes: [node({ quantityAvailable: 2 })] });
    const issues = await validateLines([{ variantId: 'gid://shopify/ProductVariant/1', quantity: 5 }]);
    expect(issues).toEqual([
      expect.objectContaining({ reason: 'insufficient-stock', availableQuantity: 2 }),
    ]);
  });

  it('makes no request for an empty bag', async () => {
    expect(await validateLines([])).toEqual([]);
    expect(storefrontRequest).not.toHaveBeenCalled();
  });
});

describe('buildBagCatalog', () => {
  it('describes every variant with its price, label and link', () => {
    const variant = makeVariant({
      price: 29.99,
      compareAtPrice: 39.99,
      selectedOptions: [{ name: 'Color', value: 'Black' }],
    });
    const product = makeProduct({
      handle: 'wallet',
      title: 'Wallet',
      variants: [variant],
      options: [{ id: 'o1', name: 'Color', position: 1, values: ['Black'] }],
    });

    const { variants } = buildBagCatalog([product]);
    expect(variants[variant.id]).toMatchObject({
      productName: 'Wallet',
      variantLabel: 'Black',
      price: 29.99,
      compareAtPrice: 39.99,
      href: '/products/wallet',
      available: true,
      hasPackOption: false,
    });
  });

  it('drops a compare-at price that is not a markdown', () => {
    const variant = makeVariant({ price: 20, compareAtPrice: 20 });
    const { variants } = buildBagCatalog([makeProduct({ variants: [variant] })]);
    expect(variants[variant.id]?.compareAtPrice).toBeNull();
  });

  it('leaves a default-title variant unlabelled', () => {
    const variant = makeVariant();
    const { variants } = buildBagCatalog([makeProduct({ variants: [variant] })]);
    expect(variants[variant.id]?.variantLabel).toBe('');
  });

  it('marks pack-size options so the bag hides the quantity stepper', () => {
    const variant = makeVariant({ selectedOptions: [{ name: 'Quantity', value: '2PCS' }] });
    const product = makeProduct({
      variants: [variant],
      options: [{ id: 'o1', name: 'Quantity', position: 1, values: ['2PCS'] }],
    });
    expect(buildBagCatalog([product]).variants[variant.id]?.hasPackOption).toBe(true);
  });

  it('caps a hard-limited variant at the stock that is left', () => {
    const limited = makeVariant({ inventoryPolicy: 'DENY', inventoryQuantity: 3 });
    const open = makeVariant({ inventoryPolicy: 'CONTINUE', inventoryQuantity: 0 });
    const { variants } = buildBagCatalog([makeProduct({ variants: [limited, open] })]);
    expect(variants[limited.id]?.maxQuantity).toBe(3);
    expect(variants[open.id]?.maxQuantity).toBe(MAX_BAG_QUANTITY);
  });

  it('keeps sold-out variants so a bag that already holds one can say so', () => {
    const variant = makeVariant({ availableForSale: false });
    const { variants } = buildBagCatalog([makeProduct({ variants: [variant] })]);
    expect(variants[variant.id]?.available).toBe(false);
  });
});
