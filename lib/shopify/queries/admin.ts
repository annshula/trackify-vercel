/**
 * Admin GraphQL API documents. Server-side only.
 *
 * Everything here is read-only against the catalog. No order/customer reads are
 * declared, so the app never needs protected-customer-data scopes.
 */

const PRODUCT_FIELDS = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    status
    createdAt
    updatedAt
    publishedAt
    totalInventory
    seo {
      title
      description
    }
    options(first: 5) {
      id
      name
      position
      values
    }
    featuredMedia {
      id
    }
    media(first: 25) {
      nodes {
        id
        mediaContentType
        alt
        preview {
          image {
            id
            url
            width
            height
            altText
          }
        }
        ... on Video {
          sources {
            url
            mimeType
            format
          }
        }
        ... on Model3d {
          sources {
            url
            mimeType
            format
          }
        }
        ... on ExternalVideo {
          embedUrl
          host
        }
      }
    }
    images(first: 25) {
      nodes {
        id
        url
        width
        height
        altText
      }
    }
    collections(first: 25) {
      nodes {
        id
        handle
        title
      }
    }
    metafields(first: 30) {
      nodes {
        namespace
        key
        value
        type
      }
    }
    variants(first: 100) {
      nodes {
        id
        title
        sku
        barcode
        price
        compareAtPrice
        position
        availableForSale
        inventoryQuantity
        inventoryPolicy
        selectedOptions {
          name
          value
        }
        image {
          id
        }
        inventoryItem {
          requiresShipping
          measurement {
            weight {
              value
              unit
            }
          }
        }
      }
    }
  }
`;

export const PRODUCTS_PAGE_QUERY = /* GraphQL */ `
  ${PRODUCT_FIELDS}
  query ProductsPage($first: Int!, $after: String) {
    products(first: $first, after: $after, sortKey: ID) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ...ProductFields
      }
    }
  }
`;

export const PRODUCT_BY_ID_QUERY = /* GraphQL */ `
  ${PRODUCT_FIELDS}
  query ProductById($id: ID!) {
    product(id: $id) {
      ...ProductFields
    }
  }
`;

export const COLLECTIONS_PAGE_QUERY = /* GraphQL */ `
  query CollectionsPage($first: Int!, $after: String) {
    collections(first: $first, after: $after, sortKey: ID) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        handle
        title
        description
        descriptionHtml
        updatedAt
        sortOrder
        seo {
          title
          description
        }
        image {
          id
          url
          width
          height
          altText
        }
      }
    }
  }
`;

export const COLLECTION_BY_ID_QUERY = /* GraphQL */ `
  query CollectionById($id: ID!) {
    collection(id: $id) {
      id
      handle
      title
      description
      descriptionHtml
      updatedAt
      sortOrder
      seo {
        title
        description
      }
      image {
        id
        url
        width
        height
        altText
      }
    }
  }
`;

export const SHOP_QUERY = /* GraphQL */ `
  query Shop {
    shop {
      name
      myshopifyDomain
      currencyCode
    }
  }
`;

export const INVENTORY_ITEM_VARIANTS_QUERY = /* GraphQL */ `
  query InventoryItemVariants($id: ID!) {
    inventoryItem(id: $id) {
      id
      variant {
        id
        product {
          id
        }
      }
    }
  }
`;

export const WEBHOOK_SUBSCRIPTIONS_QUERY = /* GraphQL */ `
  query WebhookSubscriptions {
    webhookSubscriptions(first: 100) {
      nodes {
        id
        topic
        endpoint {
          __typename
          ... on WebhookHttpEndpoint {
            callbackUrl
          }
        }
      }
    }
  }
`;

export const WEBHOOK_SUBSCRIPTION_CREATE_MUTATION = /* GraphQL */ `
  mutation WebhookCreate(
    $topic: WebhookSubscriptionTopic!
    $callbackUrl: URL!
  ) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }
    ) {
      webhookSubscription {
        id
        topic
      }
      userErrors {
        field
        message
      }
    }
  }
`;
