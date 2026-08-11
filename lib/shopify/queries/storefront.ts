/** Storefront API documents — cart lifecycle and live availability. */

export const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    updatedAt
    cost {
      subtotalAmount {
        amount
        currencyCode
      }
      totalAmount {
        amount
        currencyCode
      }
      totalTaxAmount {
        amount
        currencyCode
      }
      totalDutyAmount {
        amount
        currencyCode
      }
    }
    discountCodes {
      code
      applicable
    }
    discountAllocations {
      discountedAmount {
        amount
        currencyCode
      }
      ... on CartCodeDiscountAllocation {
        code
      }
      ... on CartAutomaticDiscountAllocation {
        title
      }
      ... on CartCustomDiscountAllocation {
        title
      }
    }
    buyerIdentity {
      email
      customer {
        id
      }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
          amountPerQuantity {
            amount
            currencyCode
          }
          compareAtAmountPerQuantity {
            amount
            currencyCode
          }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            sku
            availableForSale
            quantityAvailable
            selectedOptions {
              name
              value
            }
            image {
              url
              altText
              width
              height
            }
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            product {
              id
              handle
              title
              vendor
            }
          }
        }
      }
    }
  }
`;

export const CART_QUERY = /* GraphQL */ `
  ${CART_FRAGMENT}
  query Cart($id: ID!) {
    cart(id: $id) {
      ...CartFields
    }
  }
`;

export const CART_CREATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const CART_LINES_ADD_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const CART_LINES_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const CART_LINES_REMOVE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const CART_DISCOUNT_CODES_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const CART_BUYER_IDENTITY_UPDATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        ...CartFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

/** Live availability check — the only thing we trust over the local catalog at buy time. */
export const VARIANTS_AVAILABILITY_QUERY = /* GraphQL */ `
  query VariantsAvailability($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        availableForSale
        quantityAvailable
        currentlyNotInStock
        price {
          amount
          currencyCode
        }
        product {
          handle
          title
        }
      }
    }
  }
`;

/** Shopify-native "customers also bought" style recommendations. */
export const PRODUCT_RECOMMENDATIONS_QUERY = /* GraphQL */ `
  query ProductRecommendations($productId: ID!, $intent: ProductRecommendationIntent!) {
    productRecommendations(productId: $productId, intent: $intent) {
      id
      handle
    }
  }
`;
