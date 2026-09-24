/**
 * The synchronized storefront read model.
 *
 * This is a PUBLIC document — it is shipped to the build and read by SSR.
 * It must never contain customer data, order data, cost/margin data, or
 * merchant-private metafields.
 */

export type Money = {
  amount: number;
  currencyCode: string;
};

export type ProductStatus = 'ACTIVE' | 'ARCHIVED' | 'DRAFT';

export type CatalogImage = {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
};

export type CatalogMedia =
  | { type: 'image'; id: string; url: string; altText: string | null; width: number | null; height: number | null }
  | { type: 'video'; id: string; sources: { url: string; mimeType: string; format: string }[]; previewUrl: string | null; altText: string | null }
  | { type: 'external_video'; id: string; embedUrl: string; host: string; previewUrl: string | null; altText: string | null }
  | { type: 'model_3d'; id: string; sources: { url: string; mimeType: string; format: string }[]; previewUrl: string | null; altText: string | null };

export type SelectedOption = {
  name: string;
  value: string;
};

export type CatalogVariant = {
  /** Shopify GID, e.g. gid://shopify/ProductVariant/123 */
  id: string;
  title: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  compareAtPrice: number | null;
  currencyCode: string;
  selectedOptions: SelectedOption[];
  /** id of the CatalogImage this variant displays, if any */
  imageId: string | null;
  availableForSale: boolean;
  /** Advisory only. Shopify is authoritative at cart/checkout time. */
  inventoryQuantity: number | null;
  inventoryPolicy: 'DENY' | 'CONTINUE';
  requiresShipping: boolean;
  weight: number | null;
  weightUnit: string | null;
  position: number;
};

export type CatalogCollectionRef = {
  id: string;
  handle: string;
  title: string;
};

/** A video attached to a spec or feature metaobject. */
export type CatalogSpecVideo = {
  id: string;
  sources: { url: string; mimeType: string; format: string }[];
  previewUrl: string | null;
};

/** One entry from the `custom.specs` metaobject list (Shopify's "Product spec" definition). */
export type CatalogProductSpec = {
  label: string;
  value: string;
  description: string | null;
  image: CatalogImage | null;
  /** Set when the merchant attached a video instead of (or as well as) an image. */
  video: CatalogSpecVideo | null;
};

/** One entry from the `custom.feature_highlights` metaobject list. */
export type CatalogFeatureHighlight = {
  /** A constrained choice on the Shopify side (e.g. "stone", "fit", "ship") — treated as an opaque key here, not an enum, since the choice list is merchant-defined. */
  icon: string | null;
  label: string;
  body: string;
  image: CatalogImage | null;
  video: CatalogSpecVideo | null;
};

/**
 * One row of the "this vs. other products" comparison table, from the
 * `custom.comparison_table` metaobject list (Shopify metaobject type
 * `comparison_row`). `usValue`/`othersValue` are short freeform text set by
 * the merchant per product — e.g. feature "Battery life", us "8 hours",
 * others "2–3 hours" — not a fixed enum, since what's worth comparing
 * differs by product.
 */
export type CatalogComparisonRow = {
  feature: string;
  usValue: string;
  othersValue: string;
};

/** One entry from a product's `custom.faq` list (Shopify metaobject type `faq_item`). */
export type CatalogFaqItem = {
  question: string;
  answer: string;
};

/**
 * Editorial PDP content, all merchant-controlled in Shopify. Every list reuses
 * the `feature_highlight` metaobject (icon + label + body + optional media),
 * so one Shopify type covers every section; the metafield key decides where
 * an entry renders. Empty lists hide their section — nothing is defaulted.
 */
export type CatalogPdpContent = {
  /** `custom.benefits` — the short USP strip under the buy box. */
  benefits: CatalogFeatureHighlight[];
  /** `custom.story` — [problem, solution]. */
  story: CatalogFeatureHighlight[];
  /** `custom.how_it_works` — ordered steps. */
  howItWorks: CatalogFeatureHighlight[];
  /** `custom.use_cases` */
  useCases: CatalogFeatureHighlight[];
  /** `custom.whats_included` — one entry per item in the box. */
  whatsIncluded: CatalogFeatureHighlight[];
  /** `custom.faq` */
  faq: CatalogFaqItem[];
  /** `custom.demo_video` — real usage footage; the demo section needs it. */
  demoVideo: CatalogSpecVideo | null;
};

export type CatalogProduct = {
  /** Shopify GID, e.g. gid://shopify/Product/123 */
  id: string;
  /** Shopify handle — used verbatim as the URL segment. Never re-slugified. */
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  collections: CatalogCollectionRef[];
  images: CatalogImage[];
  media: CatalogMedia[];
  seo: { title: string | null; description: string | null };
  status: ProductStatus;
  /** True when published to the storefront (online store / headless publication) */
  publishedOnline: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  options: { id: string; name: string; position: number; values: string[] }[];
  variants: CatalogVariant[];
  priceRange: { min: number; max: number; currencyCode: string };
  compareAtPriceRange: { min: number; max: number } | null;
  /** Allowlisted public metafields, keyed "namespace.key" */
  metafields: Record<string, string>;
  /** Resolved from the `custom.specs` metaobject list, when the merchant set it. */
  specs: CatalogProductSpec[];
  /** Resolved from the `custom.feature_highlights` metaobject list, when the merchant set it. */
  featureHighlights: CatalogFeatureHighlight[];
  /** Resolved from the `custom.comparison_table` metaobject list, when the merchant set it. */
  comparisonTable: CatalogComparisonRow[];
  /** Section content for the product page, resolved from `custom.*` metafields. */
  pdp: CatalogPdpContent;
  totalInventory: number | null;
};

export type CatalogCollection = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  image: CatalogImage | null;
  seo: { title: string | null; description: string | null };
  updatedAt: string;
  productIds: string[];
  sortOrder: string | null;
};

export type Catalog = {
  version: number;
  generatedAt: string;
  shop: {
    domain: string;
    name: string | null;
    currencyCode: string;
  };
  products: CatalogProduct[];
  collections: CatalogCollection[];
};

/** old handle -> current handle, per resource kind */
export type RedirectMap = {
  version: number;
  updatedAt: string;
  products: Record<string, string>;
  collections: Record<string, string>;
};

export type SyncStats = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  products: number;
  variants: number;
  images: number;
  collections: number;
  added: string[];
  updated: string[];
  removed: string[];
  redirectsCreated: number;
  warnings: string[];
};
