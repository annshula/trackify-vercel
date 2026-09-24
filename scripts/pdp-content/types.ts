/**
 * Source-of-truth shape for PDP content pushed into Shopify by
 * `npm run shopify:push-pdp`. Shopify stays authoritative once pushed — these
 * files are the reviewed, versioned copy, not a second data store the
 * storefront reads.
 *
 * Every `Block` becomes a `feature_highlight` metaobject; `icon` must be one of
 * that definition's allowed choices (see ICONS). `image` is a Shopify
 * MediaImage GID — normally one of the product's own media ids.
 */

export const ICONS = [
  "stone", "fit", "ship", "droplet", "sparkle", "battery", "travel", "clean",
  "massage", "hand", "feather", "shield", "lock", "truck", "returns",
  "support", "package", "gift", "home", "sun", "moon", "gym", "check",
  "ruler", "tag",
] as const;

export type Icon = (typeof ICONS)[number];

export type Block = {
  icon: Icon;
  label: string;
  body: string;
  image?: string;
};

export type Spec = { label: string; value: string; description?: string };

export type Faq = { question: string; answer: string };

export type ProductPdpContent = {
  handle: string;
  /** Written to `custom.subtitle` — the one-line value proposition. */
  subtitle: string;
  /** Written to `custom.cta_headline` — the closing "Ready to …?" line. */
  ctaHeadline: string;
  benefits: Block[];
  /** [problem, solution] */
  story: [Block, Block];
  featureHighlights: Block[];
  howItWorks: Block[];
  useCases: Block[];
  whatsIncluded: Block[];
  specs: Spec[];
  faq: Faq[];
  /** Alt text per product MediaImage GID — replaces supplier hashes in Shopify. */
  mediaAlt?: Record<string, string>;
};

export type ShopPdpContent = {
  announcement: string;
  shippingProcessingTime: string;
  shippingDeliveryEstimate: string;
  shippingCostNote: string;
  shippingRegions: string;
  trustPoints: Block[];
};

export type HomeContent = {
  /** Collection GID for the featured products rail. */
  featuredCollection: string;
  /** Product GID for the spotlight section. */
  spotlightProduct: string;
  /** [0] headline + explanation + image, then benefit points. */
  intro: Block[];
  differentiators: Block[];
  /** [0] headline + line + image. */
  lifestyle: Block[];
  /** [0] headline + 2–4 sentences + image. */
  story: Block[];
  faq: Faq[];
};
