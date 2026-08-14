/** Live Shopify commerce types (Storefront + Customer Account API surfaces). */

export type MoneyV2 = {
  amount: string;
  currencyCode: string;
};

export type CartLineMerchandise = {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  quantityAvailable: number | null;
  selectedOptions: { name: string; value: string }[];
  image: { url: string; altText: string | null; width: number | null; height: number | null } | null;
  price: MoneyV2;
  compareAtPrice: MoneyV2 | null;
  product: { id: string; handle: string; title: string; vendor: string };
};

export type CartLine = {
  id: string;
  quantity: number;
  merchandise: CartLineMerchandise;
  cost: {
    totalAmount: MoneyV2;
    amountPerQuantity: MoneyV2;
    compareAtAmountPerQuantity: MoneyV2 | null;
  };
};

export type CartDiscountCode = {
  code: string;
  applicable: boolean;
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: MoneyV2;
    totalAmount: MoneyV2;
    totalTaxAmount: MoneyV2 | null;
    totalDutyAmount: MoneyV2 | null;
  };
  lines: CartLine[];
  discountCodes: CartDiscountCode[];
  /** Shopify-applied automatic + code discounts, already computed by Shopify */
  discountAllocations: { discountedAmount: MoneyV2; title: string | null; code: string | null }[];
  buyerIdentity: { email: string | null; customerAccessToken: string | null; countryCode: string | null } | null;
  updatedAt: string;
};

export type CartMutationResult =
  | { ok: true; cart: Cart; warnings: string[] }
  | { ok: false; error: string; code?: string; cart?: Cart };

/* ── Customer Account API ─────────────────────────────────────────────── */

export type CustomerAddress = {
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

export type Customer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  emailAddress: string | null;
  phoneNumber: string | null;
  defaultAddressId: string | null;
  addresses: CustomerAddress[];
};

export type FulfillmentStatus =
  | 'SUCCESS'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'OPEN'
  | 'PENDING_FULFILLMENT'
  | 'SCHEDULED'
  | 'CANCELLED'
  | 'FAILURE'
  | 'ERROR'
  | 'UNFULFILLED';

export type OrderFulfillment = {
  id: string;
  status: FulfillmentStatus;
  createdAt: string;
  estimatedDeliveryAt: string | null;
  trackingInformation: { number: string | null; company: string | null; url: string | null }[];
  events: { status: string; happenedAt: string }[];
  lineItemIds: string[];
};

export type OrderLineItem = {
  id: string;
  title: string;
  variantTitle: string | null;
  quantity: number;
  sku: string | null;
  image: { url: string; altText: string | null } | null;
  productHandle: string | null;
  price: MoneyV2 | null;
  totalPrice: MoneyV2 | null;
};

export type OrderSummary = {
  id: string;
  number: number;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  totalPrice: MoneyV2;
  lineItemCount: number;
  previewImages: { url: string; altText: string | null }[];
};

export type Order = {
  id: string;
  number: number;
  name: string;
  processedAt: string;
  cancelledAt: string | null;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  statusPageUrl: string | null;
  email: string | null;
  phone: string | null;
  shippingLine: { title: string } | null;
  lineItems: OrderLineItem[];
  fulfillments: OrderFulfillment[];
  subtotal: MoneyV2 | null;
  totalShipping: MoneyV2 | null;
  totalTax: MoneyV2 | null;
  totalPrice: MoneyV2;
  totalRefunded: MoneyV2 | null;
  discounts: { label: string | null; amount: MoneyV2 | null; percentage: number | null }[];
  shippingAddress: CustomerAddress | null;
  billingAddress: CustomerAddress | null;
  paymentInformation: {
    paymentCollectionUrl: string | null;
    brand: string | null;
    last4: string | null;
    amount: MoneyV2 | null;
    processedAt: string | null;
  } | null;
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/* ── Order actions (cancel + return) ──────────────────────────────────── */

/** Restricted to reasons a customer can honestly self-attest. Shopify's full
 *  `OrderCancelReason` enum also has DECLINED / FRAUD / INVENTORY / STAFF,
 *  which are merchant judgment calls. */
export type OrderCancelReason = 'CUSTOMER' | 'OTHER';

export type OrderCancelRefundMethod = 'ORIGINAL_PAYMENT_METHOD' | 'STORE_CREDIT';

export type CancelOrderInput = {
  orderId: string;
  reason: OrderCancelReason;
  note?: string;
  refundMethod: OrderCancelRefundMethod;
  restock: boolean;
  notifyCustomer: boolean;
};

/** Shopify Customer Account API's real `ReturnReason` enum — confirmed via live introspection. */
export type ReturnReason =
  | 'SIZE_TOO_SMALL'
  | 'SIZE_TOO_LARGE'
  | 'UNWANTED'
  | 'NOT_AS_DESCRIBED'
  | 'WRONG_ITEM'
  | 'DEFECTIVE'
  | 'STYLE'
  | 'COLOR'
  | 'OTHER'
  | 'UNKNOWN';

export type ReturnLineItemInput = {
  orderId: string;
  lineItemId: string;
  quantity: number;
  reason: ReturnReason;
};

/**
 * Shopify Customer Account API's real `Return.status` enum — confirmed via
 * live introspection against that API (not Admin's, which has a different,
 * larger shape). There is no order-level aggregate on this API; each Return
 * carries its own status.
 */
export type OrderReturnStatus = 'REQUESTED' | 'OPEN' | 'CLOSED' | 'CANCELED' | 'DECLINED';

/** One real Shopify Return object, with its own status, timestamps, and the exact line items it covers. */
export type OrderReturnDetail = {
  id: string;
  status: OrderReturnStatus;
  lineItemIds: string[];
  /** The reason the customer gave when requesting the return, per line item. */
  lineItemReasons: Record<string, ReturnReason>;
  requestedAt: string;
  closedAt: string | null;
  /** Last real change to this return — used as the date for a final status when Shopify hasn't set `closedAt` (e.g. declined returns). */
  updatedAt: string;
  tracking: { number: string | null; url: string | null; carrierName: string | null } | null;
};

/** Shopify Admin API's `ReturnDeclineReason` enum — only reachable via the privileged Admin API, never the Customer Account API. */
export type ReturnDeclineReason = 'RETURN_PERIOD_ENDED' | 'FINAL_SALE' | 'OTHER';

export type ReturnDeclineInfo = { reason: ReturnDeclineReason; note: string | null };

export type OrderReturnSummary = {
  /** One entry per actual Return on the order — a product's real timeline is built from whichever entry covers it. */
  returns: OrderReturnDetail[];
};
