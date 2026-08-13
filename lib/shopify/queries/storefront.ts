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
      countryCode
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

/*
 * Every cart operation below takes an optional $country: CountryCode.
 *
 * @inContext(country: $country) is what makes Shopify return prices already
 * converted to that country's presentment currency — this app never computes
 * a conversion itself. Passing null (the default when no country is chosen)
 * falls back to the shop's own default market/currency, so nothing changes
 * for a visitor who never touches the country selector.
 */

export const CART_QUERY = /* GraphQL */ `
  ${CART_FRAGMENT}
  query Cart($id: ID!, $country: CountryCode) @inContext(country: $country) {
    cart(id: $id) {
      ...CartFields
    }
  }
`;

export const CART_CREATE_MUTATION = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartCreate($input: CartInput!, $country: CountryCode) @inContext(country: $country) {
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
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!, $country: CountryCode)
    @inContext(country: $country) {
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
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!, $country: CountryCode)
    @inContext(country: $country) {
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
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!, $country: CountryCode)
    @inContext(country: $country) {
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
  mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!, $country: CountryCode)
    @inContext(country: $country) {
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
  mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $country: CountryCode
  ) @inContext(country: $country) {
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
  query VariantsAvailability($ids: [ID!]!, $country: CountryCode) @inContext(country: $country) {
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
        compareAtPrice {
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

/**
 * The real, merchant-configured list of countries/currencies Shopify Markets
 * publishes for this store — not a hardcoded list. Populates the currency
 * selector. If Markets isn't configured, this returns just the shop's one
 * default market.
 *
 * `localization.country` (singular) is the country/currency Shopify reports
 * for the given context: with $country left null, that's the shop's plain
 * default market; with $country set to a visitor's actual detected country
 * (see lib/localization/geo.ts), it's that country's real currency data from
 * Shopify. Shopify has no IP-geolocation of its own here — the Storefront
 * API only ever resolves whatever country this request explicitly asks for.
 */
export const LOCALIZATION_QUERY = /* GraphQL */ `
  query Localization($country: CountryCode) @inContext(country: $country) {
    localization {
      country {
        isoCode
        name
        currency {
          isoCode
          symbol
        }
      }
      availableCountries {
        isoCode
        name
        currency {
          isoCode
          symbol
        }
      }
    }
  }
`;
