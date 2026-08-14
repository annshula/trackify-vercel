/** Customer Account API documents. Every call is scoped by the customer's own token. */

const ADDRESS_FIELDS = /* GraphQL */ `
  fragment AddressFields on CustomerAddress {
    id
    firstName
    lastName
    company
    address1
    address2
    city
    zoneCode
    territoryCode
    zip
    phoneNumber
    formatted(withName: true)
  }
`;

export const CUSTOMER_QUERY = /* GraphQL */ `
  ${ADDRESS_FIELDS}
  query Customer {
    customer {
      id
      firstName
      lastName
      displayName
      emailAddress {
        emailAddress
      }
      phoneNumber {
        phoneNumber
      }
      defaultAddress {
        id
      }
      addresses(first: 20) {
        nodes {
          ...AddressFields
        }
      }
    }
  }
`;

export const CUSTOMER_ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, sortKey: PROCESSED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          number
          name
          processedAt
          financialStatus
          fulfillments(first: 1) {
            nodes {
              status
            }
          }
          totalPrice {
            amount
            currencyCode
          }
          lineItems(first: 4) {
            nodes {
              id
              title
              image {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

export const CUSTOMER_ORDER_QUERY = /* GraphQL */ `
  ${ADDRESS_FIELDS}
  query CustomerOrder($id: ID!) {
    order(id: $id) {
      id
      number
      name
      processedAt
      cancelledAt
      financialStatus
      statusPageUrl
      email
      phone
      shippingLine {
        title
      }
      paymentInformation {
        paymentCollectionUrl
      }
      transactions {
        id
        status
        processedAt
        transactionAmount {
          presentmentMoney {
            amount
            currencyCode
          }
        }
        paymentDetails {
          ... on CardPaymentDetails {
            cardBrand
            last4
          }
        }
      }
      subtotal {
        amount
        currencyCode
      }
      totalShipping {
        amount
        currencyCode
      }
      totalTax {
        amount
        currencyCode
      }
      totalPrice {
        amount
        currencyCode
      }
      totalRefunded {
        amount
        currencyCode
      }
      discountApplications(first: 10) {
        nodes {
          value {
            ... on MoneyV2 {
              amount
              currencyCode
            }
            ... on PricingPercentageValue {
              percentage
            }
          }
          ... on AutomaticDiscountApplication {
            title
          }
          ... on ManualDiscountApplication {
            title
          }
          ... on ScriptDiscountApplication {
            title
          }
          ... on DiscountCodeApplication {
            code
          }
        }
      }
      shippingAddress {
        ...AddressFields
      }
      billingAddress {
        ...AddressFields
      }
      lineItems(first: 100) {
        nodes {
          id
          title
          variantTitle
          quantity
          sku
          image {
            url
            altText
          }
          price {
            amount
            currencyCode
          }
          totalPrice {
            amount
            currencyCode
          }
        }
      }
      fulfillments(first: 20) {
        nodes {
          id
          status
          createdAt
          estimatedDeliveryAt
          trackingInformation {
            number
            company
            url
          }
          events(first: 20) {
            nodes {
              status
              happenedAt
            }
          }
          fulfillmentLineItems(first: 50) {
            nodes {
              lineItem {
                id
              }
              quantity
            }
          }
        }
      }
    }
  }
`;

/**
 * Return status for an order, attributed to the specific line items an
 * active return actually covers (via \`returnLineItems.lineItem.id\`) — never
 * a blanket status applied to every product. Field shape confirmed via live
 * introspection against the real Customer Account API (Admin API's schema
 * for returns is a different, larger shape — \`requestApprovedAt\`,
 * \`fulfillmentLineItem\`, \`reverseFulfillmentOrders\`, and an order-level
 * \`returnStatus\` all exist there but NOT here). The one still-unconfirmed
 * piece is the exact shape of \`deliverable\`'s tracking fields — see
 * \`getOrderReturnStatus\` in customer-service.ts, which logs a schema dump
 * and returns null rather than guessing if this fails.
 */
export const CUSTOMER_ORDER_RETURN_STATUS_QUERY = /* GraphQL */ `
  query CustomerOrderReturnStatus($id: ID!) {
    order(id: $id) {
      returns(first: 5) {
        nodes {
          status
          createdAt
          closedAt
          returnLineItems(first: 50) {
            nodes {
              lineItem {
                id
              }
            }
          }
          reverseDeliveries(first: 5) {
            nodes {
              deliverable {
                ... on ReverseDeliveryShippingDeliverable {
                  tracking {
                    trackingNumber
                    trackingUrl
                    carrierName
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Submits a real return request. Shape confirmed via live introspection
 * against the Customer Account API (not documented publicly at the time
 * this was written): \`orderRequestReturn(orderId: ID!, requestedLineItems:
 * [RequestedLineItemInput!]!): OrderRequestReturnPayload\`, where
 * \`RequestedLineItemInput\` is \`{ lineItemId: ID!, quantity: Int!,
 * returnReason: ReturnReason!, customerNote: String }\`.
 */
export const ORDER_REQUEST_RETURN_MUTATION = /* GraphQL */ `
  mutation OrderRequestReturn($orderId: ID!, $requestedLineItems: [RequestedLineItemInput!]!) {
    orderRequestReturn(orderId: $orderId, requestedLineItems: $requestedLineItems) {
      return {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CUSTOMER_UPDATE_MUTATION = /* GraphQL */ `
  mutation CustomerUpdate($input: CustomerUpdateInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        firstName
        lastName
        displayName
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const ADDRESS_CREATE_MUTATION = /* GraphQL */ `
  ${ADDRESS_FIELDS}
  mutation AddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
      customerAddress {
        ...AddressFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const ADDRESS_UPDATE_MUTATION = /* GraphQL */ `
  ${ADDRESS_FIELDS}
  mutation AddressUpdate($addressId: ID!, $address: CustomerAddressInput!, $defaultAddress: Boolean) {
    customerAddressUpdate(addressId: $addressId, address: $address, defaultAddress: $defaultAddress) {
      customerAddress {
        ...AddressFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const ADDRESS_DELETE_MUTATION = /* GraphQL */ `
  mutation AddressDelete($addressId: ID!) {
    customerAddressDelete(addressId: $addressId) {
      deletedAddressId
      userErrors {
        field
        message
        code
      }
    }
  }
`;
