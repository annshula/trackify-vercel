/**
 * The synchronized shop read model — same contract as types/catalog.ts and
 * types/blog.ts: a PUBLIC document shipped to the build and read by SSR.
 *
 * Store contact details (Admin API only) and legal policies (Storefront API)
 * come from two different Shopify APIs, but both change rarely and are read
 * together on the same pages, so one small file holds both.
 */

export type ShopPolicy = {
  title: string;
  body: string;
};

export type ShopPolicies = {
  termsOfService: ShopPolicy | null;
  privacyPolicy: ShopPolicy | null;
  refundPolicy: ShopPolicy | null;
  shippingPolicy: ShopPolicy | null;
};

/**
 * Only region + country are synced from Shopify. Street/city/zip are
 * intentionally not stored so the full address is never exposed.
 * Kept optional so older catalogs still type-check.
 */
export type ShopAddress = {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province: string | null;
  zip?: string | null;
  country: string | null;
};

export type ShopContact = {
  email: string | null;
  phone: string | null;
  address: ShopAddress | null;
};

/** A store-wide reassurance point (`custom.trust_points`, `feature_highlight` metaobjects). */
export type ShopTrustPoint = {
  icon: string | null;
  label: string;
  body: string;
};

/**
 * Store-wide PDP content from shop metafields (`custom.*`). Every string is
 * null until the merchant sets it, and the PDP hides the matching row rather
 * than guessing — delivery times in particular are never invented.
 */
export type ShopPdpContent = {
  announcement: string | null;
  shipping: {
    processingTime: string | null;
    deliveryEstimate: string | null;
    costNote: string | null;
    regions: string | null;
  };
  trustPoints: ShopTrustPoint[];
};

/** A `feature_highlight` metaobject as rendered on content pages. */
export type ShopContentBlock = {
  icon: string | null;
  label: string;
  body: string;
  image: { url: string; width: number | null; height: number | null; altText: string | null } | null;
};

/**
 * Homepage content from shop metafields `custom.home_*` (pushed from
 * scripts/pdp-content/_shop.ts). Product/collection references stay as GIDs
 * and are resolved against the synced catalog at render time.
 */
export type ShopHomeContent = {
  featuredCollectionId: string | null;
  spotlightProductId: string | null;
  /** [0] headline + explanation + image, then benefit points. */
  intro: ShopContentBlock[];
  differentiators: ShopContentBlock[];
  /** [0] only. */
  lifestyle: ShopContentBlock[];
  /** [0] only. */
  story: ShopContentBlock[];
  faq: { question: string; answer: string }[];
};

export type ShopCatalog = {
  version: number;
  generatedAt: string;
  contact: ShopContact;
  policies: ShopPolicies;
  /** Optional so shop.json files written before it existed still load. */
  pdp?: ShopPdpContent;
  /** Optional for the same reason as `pdp`. */
  home?: ShopHomeContent;
};

export type ShopSyncStats = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  hasContactEmail: boolean;
  hasContactAddress: boolean;
  policiesFound: number;
  warnings: string[];
};
