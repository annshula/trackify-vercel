import type {
  CatalogCollection,
  CatalogComparisonRow,
  CatalogFaqItem,
  CatalogFeatureHighlight,
  CatalogImage,
  CatalogMedia,
  CatalogPdpContent,
  CatalogProduct,
  CatalogProductSpec,
  CatalogSpecVideo,
  CatalogVariant,
  ProductStatus,
} from "@/types/catalog";
import type { Blog, BlogArticle } from "@/types/blog";

/**
 * Admin GraphQL payload -> public catalog record.
 *
 * Two responsibilities beyond shape-mapping:
 *  1. Strip anything merchant-private. Only allowlisted metafield namespaces survive.
 *  2. Produce a deterministic result so an unchanged store yields an identical file.
 */

/** Metafield namespaces safe to publish. Everything else is dropped. */
const PUBLIC_METAFIELD_NAMESPACES = new Set([
  "custom",
  "global",
  "descriptors",
  "reviews",
  "specs",
  "shopify",
]);

/** Metafield types we can render as plain text. Structured types are JSON-stringified. */
const TEXT_METAFIELD_TYPES = new Set([
  "single_line_text_field",
  "multi_line_text_field",
  "number_integer",
  "number_decimal",
  "boolean",
  "date",
  "date_time",
  "url",
  "rating",
  "json",
]);

type AdminImage = {
  id?: string | null;
  url?: string | null;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
};

type AdminMediaNode = {
  id: string;
  mediaContentType: string;
  alt?: string | null;
  preview?: { image?: AdminImage | null } | null;
  sources?: { url: string; mimeType: string; format: string }[] | null;
  embedUrl?: string | null;
  host?: string | null;
};

type AdminVariantNode = {
  id: string;
  title: string;
  sku?: string | null;
  barcode?: string | null;
  price: string;
  compareAtPrice?: string | null;
  position: number;
  availableForSale: boolean;
  inventoryQuantity?: number | null;
  inventoryPolicy?: string | null;
  selectedOptions: { name: string; value: string }[];
  image?: { id?: string | null } | null;
  inventoryItem?: {
    requiresShipping?: boolean | null;
    measurement?: { weight?: { value: number; unit: string } | null } | null;
  } | null;
};

/** A metaobject field's resolved file reference (image or video). */
type AdminMetaobjectFileRef = {
  id?: string | null;
  image?: AdminImage | null;
  sources?: { url: string; mimeType: string; format: string }[] | null;
  preview?: { image?: { url?: string | null } | null } | null;
};

type AdminMetaobjectRef = {
  id: string;
  fields: {
    key: string;
    value: string | null;
    reference?: AdminMetaobjectFileRef | null;
  }[];
  /** Set when the node is a Video file (`custom.demo_video`) rather than a metaobject. */
  sources?: { url: string; mimeType: string; format: string }[] | null;
  preview?: { image?: { url?: string | null } | null } | null;
};

type AdminMetafieldNode = {
  namespace: string;
  key: string;
  value: string;
  type: string;
};

/**
 * Metaobjects resolved separately by METAOBJECTS_BY_IDS_QUERY, keyed by GID.
 *
 * The product query deliberately doesn't resolve these inline — doing so
 * applies the nested file-reference cost to every metafield slot and blows
 * the Admin API's per-query cost limit. See that query's own note.
 */
export type MetaobjectIndex = Map<string, AdminMetaobjectRef>;

export type AdminProductNode = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  descriptionHtml?: string | null;
  vendor?: string | null;
  productType?: string | null;
  tags?: string[] | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  totalInventory?: number | null;
  seo?: { title?: string | null; description?: string | null } | null;
  options?:
    | { id: string; name: string; position: number; values: string[] }[]
    | null;
  featuredMedia?: { id: string } | null;
  media?: { nodes: AdminMediaNode[] } | null;
  images?: { nodes: AdminImage[] } | null;
  collections?: {
    nodes: { id: string; handle: string; title: string }[];
  } | null;
  metafields?: {
    nodes: AdminMetafieldNode[];
  } | null;
  variants: { nodes: AdminVariantNode[] };
  publishedOnCurrentPublication?: boolean | null;
};

export type AdminCollectionNode = {
  id: string;
  handle: string;
  title: string;
  description?: string | null;
  descriptionHtml?: string | null;
  updatedAt: string;
  sortOrder?: string | null;
  seo?: { title?: string | null; description?: string | null } | null;
  image?: AdminImage | null;
};

function toNumber(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Shopify handles can contain characters that are not URL-safe or that the
 * schema forbids (emoji, uppercase, underscores, consecutive/edge hyphens).
 * Normalize to the canonical "lowercase alphanumeric segments joined by single
 * hyphens" form so every handle is safe to use verbatim in a URL. When a handle
 * is entirely non-ASCII, derive a stable value from the resource id instead.
 */
function sanitizeHandle(handle: string, id = ""): string {
  const cleaned = handle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (cleaned) return cleaned;
  const suffix = id.split("/").pop() || "item";
  return `product-${suffix}`;
}

function normalizeImage(
  image: AdminImage | null | undefined,
  fallbackId: string,
): CatalogImage | null {
  if (!image?.url) return null;
  return {
    id: image.id ?? fallbackId,
    url: image.url,
    altText: image.altText ?? null,
    width: image.width ?? null,
    height: image.height ?? null,
  };
}

function normalizeMedia(nodes: AdminMediaNode[]): CatalogMedia[] {
  const media: CatalogMedia[] = [];

  for (const node of nodes) {
    const previewImage = node.preview?.image;
    const previewUrl = previewImage?.url ?? null;
    const altText = node.alt ?? previewImage?.altText ?? null;

    switch (node.mediaContentType) {
      case "IMAGE": {
        if (!previewUrl) break;
        media.push({
          type: "image",
          id: node.id,
          url: previewUrl,
          altText,
          width: previewImage?.width ?? null,
          height: previewImage?.height ?? null,
        });
        break;
      }
      case "VIDEO": {
        if (!node.sources?.length) break;
        media.push({
          type: "video",
          id: node.id,
          sources: node.sources,
          previewUrl,
          altText,
        });
        break;
      }
      case "EXTERNAL_VIDEO": {
        if (!node.embedUrl) break;
        media.push({
          type: "external_video",
          id: node.id,
          embedUrl: node.embedUrl,
          host: (node.host ?? "youtube").toLowerCase(),
          previewUrl,
          altText,
        });
        break;
      }
      case "MODEL_3D": {
        if (!node.sources?.length) break;
        media.push({
          type: "model_3d",
          id: node.id,
          sources: node.sources,
          previewUrl,
          altText,
        });
        break;
      }
      default:
        break;
    }
  }

  return media;
}

function normalizeMetafields(nodes: AdminMetafieldNode[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const node of nodes) {
    if (!PUBLIC_METAFIELD_NAMESPACES.has(node.namespace)) continue;
    if (!TEXT_METAFIELD_TYPES.has(node.type) && !node.type.startsWith("list."))
      continue;
    if (typeof node.value !== "string" || node.value.length > 20_000) continue;
    result[`${node.namespace}.${node.key}`] = node.value;
  }
  // Stable key ordering keeps the sync byte-identical between runs.
  return Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b)),
  );
}

/**
 * A `list.metaobject_reference` metafield stores its targets as a JSON array
 * of GID strings. Malformed values yield an empty list rather than throwing —
 * one bad metafield must not take down a whole catalog sync.
 */
function parseGidList(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

/**
 * Every metaobject GID a product's spec/feature/comparison metafields point
 * at, so the sync can batch-resolve them in one request before normalizing.
 */
export function referencedMetaobjectIds(node: AdminProductNode): string[] {
  const nodes = node.metafields?.nodes ?? [];
  const lists = [
    "specs",
    "feature_highlights",
    "comparison_table",
    ...PDP_BLOCK_KEYS.map(([key]) => key),
    "faq",
  ].flatMap((key) =>
    parseGidList(nodes.find((n) => n.namespace === "custom" && n.key === key)?.value),
  );
  // The demo video is a single file reference, resolved by the same batch.
  const demo = nodes.find((n) => n.namespace === "custom" && n.key === "demo_video")?.value;
  return demo?.startsWith("gid://") ? [...lists, demo] : lists;
}

/** Product metafields that hold `feature_highlight` lists, and where each lands in CatalogPdpContent. */
const PDP_BLOCK_KEYS = [
  ["benefits", "benefits"],
  ["story", "story"],
  ["how_it_works", "howItWorks"],
  ["use_cases", "useCases"],
  ["whats_included", "whatsIncluded"],
] as const;

/** Plain lookup of a metaobject's own fields by key, tolerating nulls. */
function fieldValue(metaobject: AdminMetaobjectRef, key: string): string | null {
  const field = metaobject.fields.find((f) => f.key === key);
  return field?.value ?? null;
}

/**
 * A metaobject's image field -> CatalogImage.
 *
 * Prefers the field's own resolved file reference, so an image that lives in
 * the store's Files library resolves even when it was never attached to this
 * product's media (the normal case for supporting imagery shot for one spec).
 * Falls back to the product's media map for older entries whose reference
 * doesn't resolve, and yields null rather than a half-built record when
 * neither source has a usable URL.
 */
function specImage(
  metaobject: AdminMetaobjectRef,
  key: string,
  imageMap: Map<string, CatalogImage>,
): CatalogImage | null {
  const field = metaobject.fields.find((f) => f.key === key);
  if (!field) return null;

  const reference = field.reference;
  const image = reference?.image;
  if (image?.url) {
    return {
      id: reference?.id ?? field.value ?? image.url,
      url: image.url,
      altText: image.altText ?? null,
      width: image.width ?? null,
      height: image.height ?? null,
    };
  }

  return (field.value && imageMap.get(field.value)) || null;
}

/** A metaobject's video field -> CatalogSpecVideo, or null when it has no playable source. */
function specVideo(
  metaobject: AdminMetaobjectRef,
  key: string,
): CatalogSpecVideo | null {
  const field = metaobject.fields.find((f) => f.key === key);
  const reference = field?.reference;
  if (!reference?.sources?.length) return null;

  return {
    id: reference.id ?? field?.value ?? reference.sources[0]!.url,
    sources: reference.sources,
    previewUrl: reference.preview?.image?.url ?? null,
  };
}

/**
 * Resolves the `custom.specs` (product_spec) and `custom.feature_highlights`
 * (feature_highlight) metaobject lists into plain records the storefront can
 * render directly — no GID chasing in components.
 *
 * Image and video fields resolve from the metaobject's own file reference, so
 * supporting imagery that lives in the store's Files library resolves even
 * when it was never attached to this product's media. `imageMap` (the
 * product's own normalized images) remains the fallback for entries whose
 * reference doesn't resolve.
 */
function normalizeSpecsAndFeatures(
  nodes: AdminMetafieldNode[],
  imageMap: Map<string, CatalogImage>,
  metaobjects: MetaobjectIndex,
): { specs: CatalogProductSpec[]; featureHighlights: CatalogFeatureHighlight[] } {
  const resolve = (key: string): AdminMetaobjectRef[] =>
    parseGidList(
      nodes.find((n) => n.namespace === "custom" && n.key === key)?.value,
    )
      .map((gid) => metaobjects.get(gid))
      .filter((entry): entry is AdminMetaobjectRef => entry !== undefined);

  const specs: CatalogProductSpec[] = resolve("specs")
    .filter((ref) => fieldValue(ref, "label") && fieldValue(ref, "value"))
    .map((ref) => ({
      label: fieldValue(ref, "label")!,
      value: fieldValue(ref, "value")!,
      description: fieldValue(ref, "description"),
      image: specImage(ref, "image", imageMap),
      video: specVideo(ref, "video"),
    }));

  const featureHighlights: CatalogFeatureHighlight[] = resolve(
    "feature_highlights",
  )
    .filter((ref) => fieldValue(ref, "label") && fieldValue(ref, "body"))
    .map((ref) => ({
      icon: fieldValue(ref, "icon"),
      label: fieldValue(ref, "label")!,
      body: fieldValue(ref, "body")!,
      image: specImage(ref, "image", imageMap),
      video: specVideo(ref, "video"),
    }));

  return { specs, featureHighlights };
}

/**
 * Resolves the `custom.comparison_table` (comparison_row) metaobject list —
 * the "this product vs. others" feature table a merchant sets per product.
 * Rows missing any of the three fields are dropped rather than rendered with
 * a blank cell.
 */
function normalizeComparisonTable(
  nodes: AdminMetafieldNode[],
  metaobjects: MetaobjectIndex,
): CatalogComparisonRow[] {
  const refs = parseGidList(
    nodes.find((n) => n.namespace === "custom" && n.key === "comparison_table")?.value,
  )
    .map((gid) => metaobjects.get(gid))
    .filter((entry): entry is AdminMetaobjectRef => entry !== undefined);

  return refs
    .filter(
      (ref) =>
        fieldValue(ref, "feature") &&
        fieldValue(ref, "us_value") &&
        fieldValue(ref, "others_value"),
    )
    .map((ref) => ({
      feature: fieldValue(ref, "feature")!,
      usValue: fieldValue(ref, "us_value")!,
      othersValue: fieldValue(ref, "others_value")!,
    }));
}

/** A resolved `feature_highlight` metaobject -> render-ready block, or null when incomplete. */
function toFeatureHighlight(
  ref: AdminMetaobjectRef,
  imageMap: Map<string, CatalogImage>,
): CatalogFeatureHighlight | null {
  const label = fieldValue(ref, "label");
  const body = fieldValue(ref, "body");
  if (!label || !body) return null;
  return {
    icon: fieldValue(ref, "icon"),
    label,
    body,
    image: specImage(ref, "image", imageMap),
    video: specVideo(ref, "video"),
  };
}

/**
 * Resolves the PDP section metafields (see CatalogPdpContent). Same rules as
 * specs/features: incomplete entries are dropped, unresolved references are
 * skipped, and an unset metafield yields an empty section.
 */
function normalizePdpContent(
  nodes: AdminMetafieldNode[],
  imageMap: Map<string, CatalogImage>,
  metaobjects: MetaobjectIndex,
): CatalogPdpContent {
  const resolve = (key: string): AdminMetaobjectRef[] =>
    parseGidList(nodes.find((n) => n.namespace === "custom" && n.key === key)?.value)
      .map((gid) => metaobjects.get(gid))
      .filter((entry): entry is AdminMetaobjectRef => entry !== undefined);

  const blocks = (key: string) =>
    resolve(key)
      .map((ref) => toFeatureHighlight(ref, imageMap))
      .filter((block): block is CatalogFeatureHighlight => block !== null);

  const faq: CatalogFaqItem[] = resolve("faq").flatMap((ref) => {
    const question = fieldValue(ref, "question");
    const answer = fieldValue(ref, "answer");
    return question && answer ? [{ question, answer }] : [];
  });

  const demoId = nodes.find((n) => n.namespace === "custom" && n.key === "demo_video")?.value;
  const demo = demoId ? metaobjects.get(demoId) : undefined;
  const demoVideo: CatalogSpecVideo | null = demo?.sources?.length
    ? { id: demo.id, sources: demo.sources, previewUrl: demo.preview?.image?.url ?? null }
    : null;

  const content = Object.fromEntries(
    PDP_BLOCK_KEYS.map(([key, field]) => [field, blocks(key)]),
  ) as Pick<CatalogPdpContent, (typeof PDP_BLOCK_KEYS)[number][1]>;

  return { ...content, faq, demoVideo };
}

function normalizeVariant(
  node: AdminVariantNode,
  currencyCode: string,
): CatalogVariant {
  const price = toNumber(node.price) ?? 0;
  const compareAt = toNumber(node.compareAtPrice ?? null);
  return {
    id: node.id,
    title: node.title,
    sku: node.sku && node.sku.trim() !== "" ? node.sku : null,
    barcode: node.barcode && node.barcode.trim() !== "" ? node.barcode : null,
    price,
    // A compare-at price that is not above the price is not a real markdown.
    compareAtPrice: compareAt !== null && compareAt > price ? compareAt : null,
    currencyCode,
    selectedOptions: node.selectedOptions.map((option) => ({
      name: option.name,
      value: option.value,
    })),
    imageId: node.image?.id ?? null,
    availableForSale: node.availableForSale,
    inventoryQuantity: node.inventoryQuantity ?? null,
    inventoryPolicy: node.inventoryPolicy === "CONTINUE" ? "CONTINUE" : "DENY",
    requiresShipping: node.inventoryItem?.requiresShipping ?? true,
    weight: node.inventoryItem?.measurement?.weight?.value ?? null,
    weightUnit: node.inventoryItem?.measurement?.weight?.unit ?? null,
    position: node.position,
  };
}

export function normalizeProduct(
  node: AdminProductNode,
  currencyCode: string,
  /** Metaobjects resolved up front by the sync; empty when a product has none. */
  metaobjects: MetaobjectIndex = new Map(),
): CatalogProduct {
  const variants = node.variants.nodes
    .map((variant) => normalizeVariant(variant, currencyCode))
    .sort((a, b) => a.position - b.position);

  const media = normalizeMedia(node.media?.nodes ?? []);

  // Images come from the media connection so ids line up with variant.image.id,
  // with the legacy images connection filling any gap.
  const imageMap = new Map<string, CatalogImage>();
  for (const item of media) {
    if (item.type === "image") {
      imageMap.set(item.id, {
        id: item.id,
        url: item.url,
        altText: item.altText,
        width: item.width,
        height: item.height,
      });
    }
  }
  for (const [index, image] of (node.images?.nodes ?? []).entries()) {
    const normalized = normalizeImage(image, `${node.id}-image-${index}`);
    if (normalized && !imageMap.has(normalized.id))
      imageMap.set(normalized.id, normalized);
  }
  const images = [...imageMap.values()];

  // A variant may point at an image id we did not fetch; drop the dangling link
  // rather than shipping a record that fails the catalog audit.
  const imageIds = new Set(images.map((image) => image.id));
  for (const variant of variants) {
    if (variant.imageId && !imageIds.has(variant.imageId))
      variant.imageId = null;
  }

  const prices = variants.map((variant) => variant.price);
  const compareAtPrices = variants
    .map((variant) => variant.compareAtPrice)
    .filter((value): value is number => value !== null);

  const status = (["ACTIVE", "ARCHIVED", "DRAFT"] as ProductStatus[]).includes(
    node.status as ProductStatus,
  )
    ? (node.status as ProductStatus)
    : "DRAFT";

  const { specs, featureHighlights } = normalizeSpecsAndFeatures(
    node.metafields?.nodes ?? [],
    imageMap,
    metaobjects,
  );
  const comparisonTable = normalizeComparisonTable(
    node.metafields?.nodes ?? [],
    metaobjects,
  );

  return {
    id: node.id,
    handle: sanitizeHandle(node.handle, node.id),
    title: node.title,
    description: node.description ?? "",
    descriptionHtml: node.descriptionHtml ?? "",
    vendor: node.vendor ?? "",
    productType: node.productType ?? "",
    tags: [...(node.tags ?? [])].sort(),
    collections: (node.collections?.nodes ?? [])
      .map((collection) => ({
        id: collection.id,
        handle: sanitizeHandle(collection.handle, collection.id),
        title: collection.title,
      }))
      .sort((a, b) => a.handle.localeCompare(b.handle)),
    images,
    media,
    seo: {
      title: node.seo?.title ?? null,
      description: node.seo?.description ?? null,
    },
    status,
    publishedOnline: Boolean(
      node.publishedOnCurrentPublication ?? node.publishedAt,
    ),
    publishedAt: node.publishedAt ?? null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    options: (node.options ?? [])
      .map((option) => ({
        id: option.id,
        name: option.name,
        position: option.position,
        values: option.values,
      }))
      .sort((a, b) => a.position - b.position),
    variants,
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      currencyCode,
    },
    compareAtPriceRange: compareAtPrices.length
      ? { min: Math.min(...compareAtPrices), max: Math.max(...compareAtPrices) }
      : null,
    metafields: normalizeMetafields(node.metafields?.nodes ?? []),
    specs,
    featureHighlights,
    comparisonTable,
    pdp: normalizePdpContent(node.metafields?.nodes ?? [], imageMap, metaobjects),
    totalInventory: node.totalInventory ?? null,
  };
}

export function normalizeCollection(
  node: AdminCollectionNode,
  productIds: string[],
): CatalogCollection {
  return {
    id: node.id,
    handle: sanitizeHandle(node.handle, node.id),
    title: node.title,
    description: node.description ?? "",
    descriptionHtml: node.descriptionHtml ?? "",
    image: normalizeImage(node.image, `${node.id}-image`),
    seo: {
      title: node.seo?.title ?? null,
      description: node.seo?.description ?? null,
    },
    updatedAt: node.updatedAt,
    productIds: [...productIds].sort(),
    sortOrder: node.sortOrder ?? null,
  };
}

/** True when the product should appear anywhere on the storefront. */
export function isPurchasable(product: CatalogProduct): boolean {
  return product.status === "ACTIVE" && product.publishedOnline;
}

/* ── Blog content ─────────────────────────────────────────────────────── */

export type AdminArticleNode = {
  id: string;
  handle: string;
  title: string;
  body: string;
  summary?: string | null;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string | null;
  publishedAt?: string | null;
  image?: AdminImage | null;
  author?: { name: string } | null;
  blog: { id: string; handle: string; title: string };
};

export type AdminBlogNode = {
  id: string;
  handle: string;
  title: string;
  tags: string[];
  updatedAt?: string | null;
};

export function normalizeArticle(node: AdminArticleNode): BlogArticle {
  return {
    id: node.id,
    handle: sanitizeHandle(node.handle, node.id),
    blogId: node.blog.id,
    blogHandle: sanitizeHandle(node.blog.handle, node.blog.id),
    blogTitle: node.blog.title,
    title: node.title,
    bodyHtml: node.body ?? "",
    excerptHtml: node.summary ?? "",
    image: normalizeImage(node.image, `${node.id}-image`),
    authorName: node.author?.name ?? null,
    tags: [...(node.tags ?? [])].sort(),
    isPublished: node.isPublished,
    publishedAt: node.publishedAt ?? null,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt ?? null,
  };
}

export function normalizeBlog(node: AdminBlogNode, articleIds: string[]): Blog {
  return {
    id: node.id,
    handle: sanitizeHandle(node.handle, node.id),
    title: node.title,
    tags: [...(node.tags ?? [])].sort(),
    articleIds: [...articleIds].sort(),
    updatedAt: node.updatedAt ?? null,
  };
}

/** True when the article should appear anywhere on the storefront. */
export function isArticleVisible(article: BlogArticle): boolean {
  return article.isPublished;
}
