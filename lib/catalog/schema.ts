import { z } from 'zod';

/**
 * Runtime schema for the synchronized catalog.
 *
 * The sync pipeline refuses to write a catalog that fails this — a malformed
 * products.json would take down every product page at once.
 */

export const imageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  altText: z.string().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});

const mediaSourceSchema = z.object({
  url: z.string().url(),
  mimeType: z.string(),
  format: z.string(),
});

export const mediaSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image'),
    id: z.string(),
    url: z.string().url(),
    altText: z.string().nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
  }),
  z.object({
    type: z.literal('video'),
    id: z.string(),
    sources: z.array(mediaSourceSchema),
    previewUrl: z.string().url().nullable(),
    altText: z.string().nullable(),
  }),
  z.object({
    type: z.literal('external_video'),
    id: z.string(),
    embedUrl: z.string().url(),
    host: z.string(),
    previewUrl: z.string().url().nullable(),
    altText: z.string().nullable(),
  }),
  z.object({
    type: z.literal('model_3d'),
    id: z.string(),
    sources: z.array(mediaSourceSchema),
    previewUrl: z.string().url().nullable(),
    altText: z.string().nullable(),
  }),
]);

export const variantSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().nullable(),
  currencyCode: z.string().length(3),
  selectedOptions: z.array(z.object({ name: z.string(), value: z.string() })),
  imageId: z.string().nullable(),
  availableForSale: z.boolean(),
  inventoryQuantity: z.number().int().nullable(),
  inventoryPolicy: z.enum(['DENY', 'CONTINUE']),
  requiresShipping: z.boolean(),
  weight: z.number().nullable(),
  weightUnit: z.string().nullable(),
  position: z.number().int().nonnegative(),
});

/** Shopify handles: lowercase alphanumeric + dashes. Used verbatim in URLs. */
export const handleSchema = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Handle must match Shopify handle format');

export const productSchema = z.object({
  id: z.string().min(1),
  handle: handleSchema,
  title: z.string().min(1),
  description: z.string(),
  descriptionHtml: z.string(),
  vendor: z.string(),
  productType: z.string(),
  tags: z.array(z.string()),
  collections: z.array(z.object({ id: z.string(), handle: z.string(), title: z.string() })),
  images: z.array(imageSchema),
  media: z.array(mediaSchema),
  seo: z.object({ title: z.string().nullable(), description: z.string().nullable() }),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DRAFT']),
  publishedOnline: z.boolean(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      position: z.number().int(),
      values: z.array(z.string()),
    }),
  ),
  variants: z.array(variantSchema).min(1, 'A product must have at least one variant'),
  priceRange: z.object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    currencyCode: z.string().length(3),
  }),
  compareAtPriceRange: z
    .object({ min: z.number().nonnegative(), max: z.number().nonnegative() })
    .nullable(),
  metafields: z.record(z.string()),
  totalInventory: z.number().int().nullable(),
});

export const collectionSchema = z.object({
  id: z.string().min(1),
  handle: handleSchema,
  title: z.string().min(1),
  description: z.string(),
  descriptionHtml: z.string(),
  image: imageSchema.nullable(),
  seo: z.object({ title: z.string().nullable(), description: z.string().nullable() }),
  updatedAt: z.string(),
  productIds: z.array(z.string()),
  sortOrder: z.string().nullable(),
});

export const catalogSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  shop: z.object({
    domain: z.string(),
    name: z.string().nullable(),
    currencyCode: z.string(),
  }),
  products: z.array(productSchema),
  collections: z.array(collectionSchema),
});

export const redirectMapSchema = z.object({
  version: z.number().int().positive(),
  updatedAt: z.string(),
  products: z.record(z.string()),
  collections: z.record(z.string()),
});

export type ValidationIssue = { path: string; message: string };

export function validateCatalog(input: unknown): { ok: true } | { ok: false; issues: ValidationIssue[] } {
  const result = catalogSchema.safeParse(input);
  if (result.success) return { ok: true };
  return {
    ok: false,
    issues: result.error.issues.slice(0, 50).map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/** Cross-record invariants the schema alone cannot express. */
export function auditCatalog(catalog: z.infer<typeof catalogSchema>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenHandles = new Map<string, string>();
  const seenIds = new Set<string>();
  const productIds = new Set(catalog.products.map((p) => p.id));

  for (const product of catalog.products) {
    const duplicate = seenHandles.get(product.handle);
    if (duplicate) {
      issues.push({
        path: `products.${product.handle}`,
        message: `Duplicate handle also used by ${duplicate} — this would produce two products at the same URL`,
      });
    }
    seenHandles.set(product.handle, product.id);

    if (seenIds.has(product.id)) {
      issues.push({ path: `products.${product.id}`, message: 'Duplicate product id' });
    }
    seenIds.add(product.id);

    const imageIds = new Set(product.images.map((image) => image.id));
    for (const variant of product.variants) {
      if (variant.imageId && !imageIds.has(variant.imageId)) {
        issues.push({
          path: `products.${product.handle}.variants.${variant.id}`,
          message: `imageId "${variant.imageId}" does not exist on the product`,
        });
      }
      if (variant.compareAtPrice !== null && variant.compareAtPrice < variant.price) {
        issues.push({
          path: `products.${product.handle}.variants.${variant.id}`,
          message: 'compareAtPrice is below price — this would render a negative discount',
        });
      }
    }

    if (product.priceRange.min > product.priceRange.max) {
      issues.push({ path: `products.${product.handle}.priceRange`, message: 'min is greater than max' });
    }
  }

  const seenCollectionHandles = new Set<string>();
  for (const collection of catalog.collections) {
    if (seenCollectionHandles.has(collection.handle)) {
      issues.push({ path: `collections.${collection.handle}`, message: 'Duplicate collection handle' });
    }
    seenCollectionHandles.add(collection.handle);

    for (const productId of collection.productIds) {
      if (!productIds.has(productId)) {
        issues.push({
          path: `collections.${collection.handle}`,
          message: `References unknown product ${productId}`,
        });
      }
    }
  }

  return issues;
}
