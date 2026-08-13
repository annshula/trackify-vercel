import 'server-only';
import type {
  Customer,
  CustomerAddress,
  Order,
  OrderFulfillment,
  OrderLineItem,
  OrderSummary,
} from '@/types/commerce';
import { customerRequest } from '@/lib/shopify/customer-account';
import {
  ADDRESS_CREATE_MUTATION,
  ADDRESS_DELETE_MUTATION,
  ADDRESS_UPDATE_MUTATION,
  CUSTOMER_ORDER_QUERY,
  CUSTOMER_ORDERS_QUERY,
  CUSTOMER_QUERY,
  CUSTOMER_UPDATE_MUTATION,
} from '@/lib/shopify/queries/customer';
import { firstUserError, type GraphQLUserError } from '@/lib/shopify/errors';

/**
 * ShopifyCustomerAccountService.
 *
 * Every call is scoped by the signed-in customer's own access token, so Shopify
 * enforces that a customer can only read their own data. Nothing here is
 * cached, stored, or logged.
 */

export class CustomerServiceError extends Error {
  readonly fieldErrors: Record<string, string>;
  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'CustomerServiceError';
    this.fieldErrors = fieldErrors;
  }
}

function toFieldErrors(errors: GraphQLUserError[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const error of errors ?? []) {
    // Shopify paths look like ["address", "zip"] — the last segment is the field.
    const field = error.field?.[error.field.length - 1];
    if (field) result[field] = error.message;
  }
  return result;
}

function assertNoUserErrors(errors: GraphQLUserError[] | undefined, fallback: string): void {
  const first = firstUserError(errors);
  if (first) throw new CustomerServiceError(first, toFieldErrors(errors));
  if (errors === undefined) throw new CustomerServiceError(fallback);
}

/* ── Customer ──────────────────────────────────────────────────────────── */

type RawAddress = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zoneCode: string | null;
  territoryCode: string | null;
  zip: string | null;
  phoneNumber: string | null;
  formatted: string[];
};

export async function getCustomer(): Promise<Customer> {
  const data = await customerRequest<{
    customer: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      displayName: string;
      emailAddress: { emailAddress: string } | null;
      phoneNumber: { phoneNumber: string } | null;
      defaultAddress: { id: string } | null;
      addresses: { nodes: RawAddress[] };
    } | null;
  }>({ query: CUSTOMER_QUERY });

  const raw = data.customer;
  if (!raw) throw new CustomerServiceError('We could not load your account.');

  return {
    id: raw.id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    displayName: raw.displayName,
    emailAddress: raw.emailAddress?.emailAddress ?? null,
    phoneNumber: raw.phoneNumber?.phoneNumber ?? null,
    defaultAddressId: raw.defaultAddress?.id ?? null,
    addresses: raw.addresses.nodes,
  };
}

/**
 * Updates the signed-in customer's name.
 *
 * Returns what Shopify actually stored rather than assuming the write landed:
 * `customerUpdate` can report success while silently ignoring a field, and
 * discarding the payload made that indistinguishable from a real save. The
 * caller echoes these values back into the form, so the UI can only ever show
 * what Shopify confirmed.
 *
 * `retries: 1` because this is a mutation — the shared transport retries on
 * timeouts and 5xx, which is right for a query but risks applying a write
 * twice.
 */
export async function updateCustomer(input: {
  firstName?: string;
  lastName?: string;
}): Promise<{ firstName: string | null; lastName: string | null }> {
  const data = await customerRequest<{
    customerUpdate: {
      customer: { id: string; firstName: string | null; lastName: string | null } | null;
      userErrors: GraphQLUserError[];
    };
  }>({ query: CUSTOMER_UPDATE_MUTATION, variables: { input }, retries: 1 });

  assertNoUserErrors(data.customerUpdate?.userErrors, 'We could not save your details.');

  const customer = data.customerUpdate?.customer;
  if (!customer) {
    // No userErrors but no customer either — the write did not happen.
    console.error('[customer] customerUpdate returned no customer; the update was not applied');
    throw new CustomerServiceError('We could not save your details.');
  }

  // Shopify accepted the call but kept the old value: almost always a missing
  // Customer Account API permission rather than anything the shopper did.
  const ignored =
    (input.firstName !== undefined && customer.firstName !== input.firstName) ||
    (input.lastName !== undefined && customer.lastName !== input.lastName);

  if (ignored) {
    console.error(
      '[customer] customerUpdate reported success but Shopify kept the previous name. ' +
        'Check that the Customer Account API client is allowed to write customer details.',
    );
    throw new CustomerServiceError(
      'Your details could not be saved. Please try again, or contact us if it keeps happening.',
    );
  }

  return { firstName: customer.firstName, lastName: customer.lastName };
}

/* ── Orders ────────────────────────────────────────────────────────────── */

export async function listOrders(options: { first?: number; after?: string | null } = {}): Promise<{
  orders: OrderSummary[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  const data = await customerRequest<{
    customer: {
      orders: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: {
          id: string;
          number: number;
          name: string;
          processedAt: string;
          financialStatus: string | null;
          fulfillments: { nodes: { status: string }[] };
          totalPrice: { amount: string; currencyCode: string };
          lineItems: { nodes: { id: string; title: string; image: { url: string; altText: string | null } | null }[] };
        }[];
      };
    } | null;
  }>({
    query: CUSTOMER_ORDERS_QUERY,
    variables: { first: options.first ?? 10, after: options.after ?? null },
  });

  const connection = data.customer?.orders;
  if (!connection) return { orders: [], hasNextPage: false, endCursor: null };

  return {
    orders: connection.nodes.map((order) => ({
      id: order.id,
      number: order.number,
      name: order.name,
      processedAt: order.processedAt,
      financialStatus: order.financialStatus,
      fulfillmentStatus: order.fulfillments.nodes[0]?.status ?? null,
      totalPrice: order.totalPrice,
      lineItemCount: order.lineItems.nodes.length,
      previewImages: order.lineItems.nodes
        .map((item) => item.image)
        .filter((image): image is { url: string; altText: string | null } => image !== null)
        .slice(0, 4),
    })),
    hasNextPage: connection.pageInfo.hasNextPage,
    endCursor: connection.pageInfo.endCursor,
  };
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const data = await customerRequest<{
    order: {
      id: string;
      number: number;
      name: string;
      processedAt: string;
      cancelledAt: string | null;
      financialStatus: string | null;
      statusPageUrl: string | null;
      subtotal: { amount: string; currencyCode: string } | null;
      totalShipping: { amount: string; currencyCode: string } | null;
      totalTax: { amount: string; currencyCode: string } | null;
      totalPrice: { amount: string; currencyCode: string };
      totalRefunded: { amount: string; currencyCode: string } | null;
      discountApplications: {
        nodes: {
          title?: string | null;
          code?: string | null;
          value?:
            | { amount: string; currencyCode: string }
            | { percentage: number }
            | null;
        }[];
      };
      shippingAddress: RawAddress | null;
      billingAddress: RawAddress | null;
      lineItems: {
        nodes: {
          id: string;
          title: string;
          variantTitle: string | null;
          quantity: number;
          sku: string | null;
          image: { url: string; altText: string | null } | null;
          price: { amount: string; currencyCode: string } | null;
          totalPrice: { amount: string; currencyCode: string } | null;
        }[];
      };
      fulfillments: {
        nodes: {
          id: string;
          status: string;
          createdAt: string;
          estimatedDeliveryAt: string | null;
          trackingInformation: { number: string | null; company: string | null; url: string | null }[];
          events: { nodes: { status: string; happenedAt: string }[] };
          fulfillmentLineItems: { nodes: { lineItem: { id: string }; quantity: number }[] };
        }[];
      };
    } | null;
  }>({ query: CUSTOMER_ORDER_QUERY, variables: { id: orderId } });

  const raw = data.order;
  if (!raw) return null;

  const lineItems: OrderLineItem[] = raw.lineItems.nodes.map((item) => ({
    id: item.id,
    title: item.title,
    variantTitle: item.variantTitle,
    quantity: item.quantity,
    sku: item.sku,
    image: item.image,
    // The Customer Account API does not expose a product handle on line items.
    productHandle: null,
    price: item.price,
    totalPrice: item.totalPrice,
  }));

  const fulfillments: OrderFulfillment[] = raw.fulfillments.nodes.map((fulfillment) => ({
    id: fulfillment.id,
    status: fulfillment.status as OrderFulfillment['status'],
    createdAt: fulfillment.createdAt,
    estimatedDeliveryAt: fulfillment.estimatedDeliveryAt,
    trackingInformation: fulfillment.trackingInformation,
    events: fulfillment.events.nodes,
    lineItemIds: fulfillment.fulfillmentLineItems.nodes.map((node) => node.lineItem.id),
  }));

  return {
    id: raw.id,
    number: raw.number,
    name: raw.name,
    processedAt: raw.processedAt,
    cancelledAt: raw.cancelledAt,
    financialStatus: raw.financialStatus,
    fulfillmentStatus: fulfillments[0]?.status ?? null,
    statusPageUrl: raw.statusPageUrl,
    lineItems,
    fulfillments,
    subtotal: raw.subtotal,
    totalShipping: raw.totalShipping,
    totalTax: raw.totalTax,
    totalPrice: raw.totalPrice,
    totalRefunded: raw.totalRefunded,
    discounts: raw.discountApplications.nodes.map((discount) => ({
      label: discount.title ?? discount.code ?? null,
      amount: discount.value && 'amount' in discount.value ? discount.value : null,
      percentage: discount.value && 'percentage' in discount.value ? discount.value.percentage : null,
    })),
    shippingAddress: raw.shippingAddress,
    billingAddress: raw.billingAddress,
    paymentInformation: null,
  };
}

/* ── Addresses ─────────────────────────────────────────────────────────── */

export type AddressInput = {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  zoneCode?: string;
  territoryCode?: string;
  zip?: string;
  phoneNumber?: string;
};

export async function createAddress(
  address: AddressInput,
  makeDefault: boolean,
): Promise<CustomerAddress> {
  const data = await customerRequest<{
    customerAddressCreate: { customerAddress: RawAddress | null; userErrors: GraphQLUserError[] };
  }>({
    query: ADDRESS_CREATE_MUTATION,
    variables: { address, defaultAddress: makeDefault },
  });

  assertNoUserErrors(data.customerAddressCreate?.userErrors, 'We could not save that address.');
  const created = data.customerAddressCreate.customerAddress;
  if (!created) throw new CustomerServiceError('We could not save that address.');
  return created;
}

export async function updateAddress(
  addressId: string,
  address: AddressInput,
  makeDefault: boolean,
): Promise<CustomerAddress> {
  const data = await customerRequest<{
    customerAddressUpdate: { customerAddress: RawAddress | null; userErrors: GraphQLUserError[] };
  }>({
    query: ADDRESS_UPDATE_MUTATION,
    variables: { addressId, address, defaultAddress: makeDefault },
  });

  assertNoUserErrors(data.customerAddressUpdate?.userErrors, 'We could not update that address.');
  const updated = data.customerAddressUpdate.customerAddress;
  if (!updated) throw new CustomerServiceError('We could not update that address.');
  return updated;
}

export async function deleteAddress(addressId: string): Promise<void> {
  const data = await customerRequest<{
    customerAddressDelete: { deletedAddressId: string | null; userErrors: GraphQLUserError[] };
  }>({ query: ADDRESS_DELETE_MUTATION, variables: { addressId } });

  assertNoUserErrors(data.customerAddressDelete?.userErrors, 'We could not delete that address.');
}
