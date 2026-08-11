import type {
  CatalogCollection,
  CatalogImage,
  CatalogMedia,
  CatalogProduct,
  CatalogVariant,
  ProductStatus,
} from '@/types/catalog';

/**
 * Admin GraphQL payload -> public catalog record.
 *
 * Two responsibilities beyond shape-mapping:
 *  1. Strip anything merchant-private. Only allowlisted metafield namespaces survive.
 *  2. Produce a deterministic result so an unchanged store yields an identical file.
 */

/** Metafield namespaces safe to publish. Everything else is dropped. */
const PUBLIC_METAFIELD_NAMESPACES = new Set(['custom', 'global', 'descriptors', 'reviews', 'specs', 'shopify']);

/** Metafield types we can render as plain text. Structured types are JSON-stringified. */
const TEXT_METAFIELD_TYPES = new Set([
  'single_line_text_field',
  'multi_line_text_field',
  'number_integer',
  'number_decimal',
  'boolean',
  'date',
  'date_time',
  'url',
  'rating',
  'json',
]);

type AdminImage = { id?: string | null; url?: string | null; width?: number | null; height?: number | null; altText?: string | null };

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
  options?: { id: string; name: string; position: number; values: string[] }[] | null;
  featuredMedia?: { id: string } | null;
  media?: { nodes: AdminMediaNode[] } | null;
  images?: { nodes: AdminImage[] } | null;
  collections?: { nodes: { id: string; handle: string; title: string }[] } | null;
  metafields?: { nodes: { namespace: string; key: string; value: string; type: string }[] } | null;
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
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeImage(image: AdminImage | null | undefined, fallbackId: string): CatalogImage | null {
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
      case 'IMAGE': {
        if (!previewUrl) break;
        media.push({
          type: 'image',
          id: node.id,
          url: previewUrl,
          altText,
          width: previewImage?.width ?? null,
          height: previewImage?.height ?? null,
        });
        break;
      }
      case 'VIDEO': {
        if (!node.sources?.length) break;
        media.push({ type: 'video', id: node.id, sources: node.sources, previewUrl, altText });
        break;
      }
      case 'EXTERNAL_VIDEO': {
        if (!node.embedUrl) break;
        media.push({
          type: 'external_video',
          id: node.id,
          embedUrl: node.embedUrl,
          host: (node.host ?? 'youtube').toLowerCase(),
          previewUrl,
          altText,
        });
        break;
      }
      case 'MODEL_3D': {
        if (!node.sources?.length) break;
        media.push({ type: 'model_3d', id: node.id, sources: node.sources, previewUrl, altText });
        break;
      }
      default:
        break;
    }
  }

  return media;
}

function normalizeMetafields(
  nodes: { namespace: string; key: string; value: string; type: string }[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const node of nodes) {
    if (!PUBLIC_METAFIELD_NAMESPACES.has(node.namespace)) continue;
    if (!TEXT_METAFIELD_TYPES.has(node.type) && !node.type.startsWith('list.')) continue;
    if (typeof node.value !== 'string' || node.value.length > 20_000) continue;
    result[`${node.namespace}.${node.key}`] = node.value;
  }
  // Stable key ordering keeps the sync byte-identical between runs.
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

function normalizeVariant(node: AdminVariantNode, currencyCode: string): CatalogVariant {
  const price = toNumber(node.price) ?? 0;
  const compareAt = toNumber(node.compareAtPrice ?? null);
  return {
    id: node.id,
    title: node.title,
    sku: node.sku && node.sku.trim() !== '' ? node.sku : null,
    barcode: node.barcode && node.barcode.trim() !== '' ? node.barcode : null,
    price,
    // A compare-at price that is not above the price is not a real markdown.
    compareAtPrice: compareAt !== null && compareAt > price ? compareAt : null,
    currencyCode,
    selectedOptions: node.selectedOptions.map((option) => ({ name: option.name, value: option.value })),
    imageId: node.image?.id ?? null,
    availableForSale: node.availableForSale,
    inventoryQuantity: node.inventoryQuantity ?? null,
    inventoryPolicy: node.inventoryPolicy === 'CONTINUE' ? 'CONTINUE' : 'DENY',
    requiresShipping: node.inventoryItem?.requiresShipping ?? true,
    weight: node.inventoryItem?.measurement?.weight?.value ?? null,
    weightUnit: node.inventoryItem?.measurement?.weight?.unit ?? null,
    position: node.position,
  };
}

export function normalizeProduct(node: AdminProductNode, currencyCode: string): CatalogProduct {
  const variants = node.variants.nodes
    .map((variant) => normalizeVariant(variant, currencyCode))
    .sort((a, b) => a.position - b.position);

  const media = normalizeMedia(node.media?.nodes ?? []);

  // Images come from the media connection so ids line up with variant.image.id,
  // with the legacy images connection filling any gap.
  const imageMap = new Map<string, CatalogImage>();
  for (const item of media) {
    if (item.type === 'image') {
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
    if (normalized && !imageMap.has(normalized.id)) imageMap.set(normalized.id, normalized);
  }
  const images = [...imageMap.values()];

  // A variant may point at an image id we did not fetch; drop the dangling link
  // rather than shipping a record that fails the catalog audit.
  const imageIds = new Set(images.map((image) => image.id));
  for (const variant of variants) {
    if (variant.imageId && !imageIds.has(variant.imageId)) variant.imageId = null;
  }

  const prices = variants.map((variant) => variant.price);
  const compareAtPrices = variants
    .map((variant) => variant.compareAtPrice)
    .filter((value): value is number => value !== null);

  const status = (['ACTIVE', 'ARCHIVED', 'DRAFT'] as ProductStatus[]).includes(node.status as ProductStatus)
    ? (node.status as ProductStatus)
    : 'DRAFT';

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description ?? '',
    descriptionHtml: node.descriptionHtml ?? '',
    vendor: node.vendor ?? '',
    productType: node.productType ?? '',
    tags: [...(node.tags ?? [])].sort(),
    collections: (node.collections?.nodes ?? [])
      .map((collection) => ({ id: collection.id, handle: collection.handle, title: collection.title }))
      .sort((a, b) => a.handle.localeCompare(b.handle)),
    images,
    media,
    seo: { title: node.seo?.title ?? null, description: node.seo?.description ?? null },
    status,
    publishedOnline: Boolean(node.publishedOnCurrentPublication ?? node.publishedAt),
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
    totalInventory: node.totalInventory ?? null,
  };
}

export function normalizeCollection(node: AdminCollectionNode, productIds: string[]): CatalogCollection {
  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    description: node.description ?? '',
    descriptionHtml: node.descriptionHtml ?? '',
    image: normalizeImage(node.image, `${node.id}-image`),
    seo: { title: node.seo?.title ?? null, description: node.seo?.description ?? null },
    updatedAt: node.updatedAt,
    productIds: [...productIds].sort(),
    sortOrder: node.sortOrder ?? null,
  };
}

/** True when the product should appear anywhere on the storefront. */
export function isPurchasable(product: CatalogProduct): boolean {
  return product.status === 'ACTIVE' && product.publishedOnline;
}
