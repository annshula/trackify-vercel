import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { Cart } from '@/types/commerce';

/**
 * Cart tests exercise the service against a mocked GraphQL transport, so the
 * mutation shapes, error handling and validation logic are covered without a
 * live Shopify store.
 */

const storefrontRequest = vi.fn();

vi.mock('@/lib/shopify/storefront', () => ({ storefrontRequest }));

const {
  CartError,
  addLines,
  createCart,
  getCart,
  removeLines,
  setDiscountCodes,
  updateLines,
  validateCart,
} = await import('@/services/shopify/cart-service');

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
    buyerIdentity: { email: null, customer: null },
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

describe('cart reads', () => {
  it('maps a Shopify cart into the app shape', async () => {
    storefrontRequest.mockResolvedValue({ cart: rawCart() });
    const cart = await getCart('gid://shopify/Cart/abc123');

    expect(cart?.id).toBe('gid://shopify/Cart/abc123');
    expect(cart?.lines).toHaveLength(1);
    expect(cart?.lines[0]?.merchandise.product.handle).toBe('test');
  });

  it('returns null for an expired cart instead of throwing', async () => {
    storefrontRequest.mockResolvedValue({ cart: null });
    expect(await getCart('gid://shopify/Cart/gone')).toBeNull();
  });

  it('drops a line whose merchandise is not a product variant', async () => {
    const cart = rawCart({
      lines: { nodes: [{ id: 'l1', quantity: 1, cost: {}, merchandise: null }] },
    });
    storefrontRequest.mockResolvedValue({ cart });
    expect((await getCart('x'))?.lines).toHaveLength(0);
  });
});

describe('cart mutations', () => {
  it('creates a cart', async () => {
    storefrontRequest.mockResolvedValue({ cartCreate: { cart: rawCart(), userErrors: [] } });
    const cart = await createCart([{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 1 }]);
    expect(cart.checkoutUrl).toContain('/cart/c/');
  });

  it('adds lines', async () => {
    storefrontRequest.mockResolvedValue({ cartLinesAdd: { cart: rawCart(), userErrors: [] } });
    const cart = await addLines('gid://shopify/Cart/abc123', [
      { merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 2 },
    ]);
    expect(cart.totalQuantity).toBe(1);
  });

  it('updates line quantities', async () => {
    storefrontRequest.mockResolvedValue({ cartLinesUpdate: { cart: rawCart(), userErrors: [] } });
    await expect(
      updateLines('gid://shopify/Cart/abc123', [{ id: 'gid://shopify/CartLine/1', quantity: 3 }]),
    ).resolves.toBeDefined();
  });

  it('removes lines', async () => {
    storefrontRequest.mockResolvedValue({
      cartLinesRemove: { cart: rawCart({ lines: { nodes: [] }, totalQuantity: 0 }), userErrors: [] },
    });
    const cart = await removeLines('gid://shopify/Cart/abc123', ['gid://shopify/CartLine/1']);
    expect(cart.lines).toHaveLength(0);
  });

  it('surfaces a Shopify user error as a CartError', async () => {
    storefrontRequest.mockResolvedValue({
      cartLinesAdd: {
        cart: null,
        userErrors: [{ field: ['lines'], message: 'The merchandise is out of stock.', code: 'MERCHANDISE_NOT_ENOUGH_STOCK' }],
      },
    });

    await expect(
      addLines('gid://shopify/Cart/abc123', [{ merchandiseId: 'gid://shopify/ProductVariant/1', quantity: 99 }]),
    ).rejects.toThrow(CartError);
  });

  it('preserves the Shopify error code on the thrown error', async () => {
    storefrontRequest.mockResolvedValue({
      cartLinesAdd: { cart: null, userErrors: [{ message: 'Out of stock', code: 'NOT_ENOUGH_STOCK' }] },
    });

    await expect(
      addLines('c', [{ merchandiseId: 'v', quantity: 1 }]),
    ).rejects.toMatchObject({ code: 'NOT_ENOUGH_STOCK' });
  });

  it('normalizes discount allocations from all three Shopify shapes', async () => {
    storefrontRequest.mockResolvedValue({
      cartDiscountCodesUpdate: {
        cart: rawCart({
          discountCodes: [{ code: 'SAVE10', applicable: true }],
          discountAllocations: [
            { discountedAmount: { amount: '5.00', currencyCode: 'USD' }, code: 'SAVE10' },
            { discountedAmount: { amount: '2.00', currencyCode: 'USD' }, title: 'Auto discount' },
          ],
        }),
        userErrors: [],
      },
    });

    const cart = await setDiscountCodes('gid://shopify/Cart/abc123', ['SAVE10']);
    expect(cart.discountAllocations[0]?.code).toBe('SAVE10');
    expect(cart.discountAllocations[1]?.title).toBe('Auto discount');
  });
});

describe('pre-checkout validation', () => {
  const cart: Cart = {
    id: 'gid://shopify/Cart/abc123',
    checkoutUrl: 'https://example.test/checkout',
    totalQuantity: 3,
    updatedAt: '2025-01-02T00:00:00.000Z',
    cost: {
      subtotalAmount: { amount: '150.00', currencyCode: 'USD' },
      totalAmount: { amount: '150.00', currencyCode: 'USD' },
      totalTaxAmount: null,
      totalDutyAmount: null,
    },
    discountCodes: [],
    discountAllocations: [],
    buyerIdentity: null,
    lines: [
      {
        id: 'gid://shopify/CartLine/1',
        quantity: 3,
        cost: {
          totalAmount: { amount: '150.00', currencyCode: 'USD' },
          amountPerQuantity: { amount: '50.00', currencyCode: 'USD' },
          compareAtAmountPerQuantity: null,
        },
        merchandise: {
          id: 'gid://shopify/ProductVariant/1',
          title: 'Default Title',
          sku: 'SKU-1',
          availableForSale: true,
          quantityAvailable: 10,
          selectedOptions: [],
          image: null,
          price: { amount: '50.00', currencyCode: 'USD' },
          compareAtPrice: null,
          product: { id: 'gid://shopify/Product/1', handle: 'test', title: 'Test Product', vendor: 'V' },
        },
      },
    ],
  };

  it('reports no issues when live data matches the cart', async () => {
    storefrontRequest.mockResolvedValue({
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/1',
          availableForSale: true,
          quantityAvailable: 10,
          currentlyNotInStock: false,
          price: { amount: '50.00', currencyCode: 'USD' },
        },
      ],
    });
    expect(await validateCart(cart)).toEqual([]);
  });

  it('flags a variant that is no longer for sale', async () => {
    storefrontRequest.mockResolvedValue({
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/1',
          availableForSale: false,
          quantityAvailable: 0,
          currentlyNotInStock: true,
          price: { amount: '50.00', currencyCode: 'USD' },
        },
      ],
    });

    const issues = await validateCart(cart);
    expect(issues[0]?.reason).toBe('unavailable');
  });

  it('flags insufficient stock and reports what is left', async () => {
    storefrontRequest.mockResolvedValue({
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/1',
          availableForSale: true,
          quantityAvailable: 1,
          currentlyNotInStock: false,
          price: { amount: '50.00', currencyCode: 'USD' },
        },
      ],
    });

    const issues = await validateCart(cart);
    expect(issues[0]).toMatchObject({ reason: 'insufficient-stock', availableQuantity: 1 });
  });

  it('flags a price change since the item was added', async () => {
    storefrontRequest.mockResolvedValue({
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/1',
          availableForSale: true,
          quantityAvailable: 10,
          currentlyNotInStock: false,
          price: { amount: '59.00', currencyCode: 'USD' },
        },
      ],
    });

    expect((await validateCart(cart))[0]?.reason).toBe('price-changed');
  });

  it('flags a variant Shopify no longer returns at all', async () => {
    storefrontRequest.mockResolvedValue({ nodes: [null] });
    expect((await validateCart(cart))[0]?.reason).toBe('unavailable');
  });

  it('skips the Shopify round-trip for an empty cart', async () => {
    await validateCart({ ...cart, lines: [] });
    expect(storefrontRequest).not.toHaveBeenCalled();
  });
});
