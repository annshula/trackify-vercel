import 'server-only';
import { productRepository } from '@/lib/catalog';
import { blogRepository } from '@/lib/catalog/blog';
import {
  syncSingleArticle,
  syncSingleBlog,
  syncSingleCollection,
  syncSingleProduct,
} from '@/services/synchronization/sync-service';
import { adminRequest } from '@/lib/shopify/admin';
import { INVENTORY_ITEM_VARIANTS_QUERY } from '@/lib/shopify/queries/admin';
import { CACHE_TAGS, purgePath, purgeTag } from '@/lib/catalog/tags';

export type WebhookTopic =
  | 'products/create'
  | 'products/update'
  | 'products/delete'
  | 'collections/create'
  | 'collections/update'
  | 'collections/delete'
  | 'inventory_levels/update'
  | 'product_listings/add'
  | 'product_listings/remove'
  | 'blogs/create'
  | 'blogs/update'
  | 'blogs/delete'
  | 'articles/create'
  | 'articles/update'
  | 'articles/delete'
  | 'shop/redact';

export type WebhookResult = {
  handled: boolean;
  action: string;
  detail?: string;
};

const productGid = (id: string | number) =>
  String(id).startsWith('gid://') ? String(id) : `gid://shopify/Product/${id}`;

const collectionGid = (id: string | number) =>
  String(id).startsWith('gid://') ? String(id) : `gid://shopify/Collection/${id}`;

const blogGid = (id: string | number) =>
  String(id).startsWith('gid://') ? String(id) : `gid://shopify/Blog/${id}`;

const articleGid = (id: string | number) =>
  String(id).startsWith('gid://') ? String(id) : `gid://shopify/Article/${id}`;

function revalidateProduct(handle: string): void {
  purgeTag(CACHE_TAGS.product(handle));
  purgeTag(CACHE_TAGS.catalog);
  purgePath(`/products/${handle}`);
}

function revalidateCollection(handle: string): void {
  purgeTag(CACHE_TAGS.collection(handle));
  purgeTag(CACHE_TAGS.catalog);
  purgePath(`/collections/${handle}`);
}

function revalidateBlog(handle: string): void {
  purgeTag(CACHE_TAGS.blog(handle));
  purgeTag(CACHE_TAGS.blogCatalog);
  purgePath(`/blogs/${handle}`);
}

function revalidateArticle(blogHandle: string, articleHandle: string): void {
  purgeTag(CACHE_TAGS.article(blogHandle, articleHandle));
  purgeTag(CACHE_TAGS.blogCatalog);
  purgePath(`/blogs/${blogHandle}/${articleHandle}`);
}

/**
 * Routes a verified webhook to the smallest possible amount of work.
 *
 * Every branch re-fetches the authoritative record from the Admin API rather
 * than trusting the webhook payload, then updates only the affected records.
 * A full catalog rebuild never happens here.
 */
export async function handleWebhook(
  topic: string,
  payload: Record<string, unknown>,
): Promise<WebhookResult> {
  switch (topic as WebhookTopic) {
    case 'products/create':
    case 'products/update':
    case 'product_listings/add': {
      const id = payload.id ?? payload.product_id;
      if (id === undefined || id === null) return { handled: false, action: 'missing-product-id' };

      const product = await syncSingleProduct(productGid(id as string | number));
      if (!product) {
        // Shopify says it exists but Admin returned null — it was deleted or
        // unpublished between the event and our fetch. Drop it locally.
        const removed = await productRepository.deleteProduct(productGid(id as string | number));
        purgeTag(CACHE_TAGS.catalog);
        return { handled: true, action: removed ? 'product-removed-not-found' : 'product-not-found' };
      }

      revalidateProduct(product.handle);
      for (const ref of product.collections) revalidateCollection(ref.handle);
      purgePath('/');
      return { handled: true, action: 'product-upserted', detail: product.handle };
    }

    case 'products/delete':
    case 'product_listings/remove': {
      const id = payload.id ?? payload.product_id;
      if (id === undefined || id === null) return { handled: false, action: 'missing-product-id' };

      const gid = productGid(id as string | number);
      const existing = await productRepository.getProductById(gid);
      const removed = await productRepository.deleteProduct(gid);

      if (existing) {
        revalidateProduct(existing.handle);
        for (const ref of existing.collections) revalidateCollection(ref.handle);
      }
      purgeTag(CACHE_TAGS.catalog);
      purgePath('/');
      return { handled: true, action: removed ? 'product-deleted' : 'product-already-absent' };
    }

    case 'collections/create':
    case 'collections/update': {
      const id = payload.id;
      if (id === undefined || id === null) return { handled: false, action: 'missing-collection-id' };

      const collection = await syncSingleCollection(collectionGid(id as string | number));
      if (!collection) return { handled: true, action: 'collection-not-found' };

      revalidateCollection(collection.handle);
      purgePath('/collections');
      return { handled: true, action: 'collection-upserted', detail: collection.handle };
    }

    case 'collections/delete': {
      const id = payload.id;
      if (id === undefined || id === null) return { handled: false, action: 'missing-collection-id' };

      const gid = collectionGid(id as string | number);
      const collections = await productRepository.getAllCollections();
      const existing = collections.find((collection) => collection.id === gid);
      const removed = await productRepository.deleteCollection(gid);

      if (existing) revalidateCollection(existing.handle);
      purgePath('/collections');
      return { handled: true, action: removed ? 'collection-deleted' : 'collection-already-absent' };
    }

    case 'inventory_levels/update': {
      // The payload carries an inventory item, not a product. Resolve the owning
      // variant, then refresh that single product — never the whole catalog.
      const inventoryItemId = payload.inventory_item_id;
      if (inventoryItemId === undefined || inventoryItemId === null) {
        return { handled: false, action: 'missing-inventory-item-id' };
      }

      const gid = String(inventoryItemId).startsWith('gid://')
        ? String(inventoryItemId)
        : `gid://shopify/InventoryItem/${inventoryItemId}`;

      const data = await adminRequest<{
        inventoryItem: { variant: { product: { id: string } } | null } | null;
      }>({ query: INVENTORY_ITEM_VARIANTS_QUERY, variables: { id: gid } });

      const owningProductId = data.inventoryItem?.variant?.product?.id;
      if (!owningProductId) return { handled: true, action: 'inventory-item-has-no-product' };

      const product = await syncSingleProduct(owningProductId);
      if (!product) return { handled: true, action: 'inventory-product-not-found' };

      revalidateProduct(product.handle);
      return { handled: true, action: 'inventory-updated', detail: product.handle };
    }

    case 'blogs/create':
    case 'blogs/update': {
      const id = payload.id;
      if (id === undefined || id === null) return { handled: false, action: 'missing-blog-id' };

      const blog = await syncSingleBlog(blogGid(id as string | number));
      if (!blog) return { handled: true, action: 'blog-not-found' };

      revalidateBlog(blog.handle);
      purgePath('/blogs');
      return { handled: true, action: 'blog-upserted', detail: blog.handle };
    }

    case 'blogs/delete': {
      const id = payload.id;
      if (id === undefined || id === null) return { handled: false, action: 'missing-blog-id' };

      const gid = blogGid(id as string | number);
      const blogs = await blogRepository.getAllBlogs();
      const existing = blogs.find((blog) => blog.id === gid);
      const removed = await blogRepository.deleteBlog(gid);

      if (existing) revalidateBlog(existing.handle);
      purgeTag(CACHE_TAGS.blogCatalog);
      purgePath('/blogs');
      return { handled: true, action: removed ? 'blog-deleted' : 'blog-already-absent' };
    }

    case 'articles/create':
    case 'articles/update': {
      const id = payload.id;
      if (id === undefined || id === null) return { handled: false, action: 'missing-article-id' };

      const article = await syncSingleArticle(articleGid(id as string | number));
      if (!article) {
        const removed = await blogRepository.deleteArticle(articleGid(id as string | number));
        purgeTag(CACHE_TAGS.blogCatalog);
        return { handled: true, action: removed ? 'article-removed-not-found' : 'article-not-found' };
      }

      revalidateArticle(article.blogHandle, article.handle);
      purgePath(`/blogs/${article.blogHandle}`);
      return { handled: true, action: 'article-upserted', detail: `${article.blogHandle}/${article.handle}` };
    }

    case 'articles/delete': {
      const id = payload.id;
      if (id === undefined || id === null) return { handled: false, action: 'missing-article-id' };

      const gid = articleGid(id as string | number);
      const articles = await blogRepository.getAllArticles({ includeUnpublished: true });
      const existing = articles.find((article) => article.id === gid);
      const removed = await blogRepository.deleteArticle(gid);

      if (existing) {
        revalidateArticle(existing.blogHandle, existing.handle);
        purgePath(`/blogs/${existing.blogHandle}`);
      }
      purgeTag(CACHE_TAGS.blogCatalog);
      return { handled: true, action: removed ? 'article-deleted' : 'article-already-absent' };
    }

    case 'shop/redact':
      // No customer data is stored locally, so there is nothing to redact.
      return { handled: true, action: 'noop-no-local-customer-data' };

    default:
      return { handled: false, action: 'unsupported-topic', detail: topic };
  }
}
