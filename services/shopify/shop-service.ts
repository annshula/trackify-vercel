import 'server-only';
import { storefrontRequest } from '@/lib/shopify/storefront';
import { SHOP_POLICIES_QUERY } from '@/lib/shopify/queries/storefront';

export type ShopPolicy = { title: string; body: string };

export type ShopPolicies = {
  termsOfService: ShopPolicy | null;
  privacyPolicy: ShopPolicy | null;
  refundPolicy: ShopPolicy | null;
  shippingPolicy: ShopPolicy | null;
};

/**
 * The merchant's real Shopify-configured legal policies. Caching is the
 * caller's job (route-level `revalidate`) — this always asks fresh, same as
 * the rest of this service layer.
 */
export async function getShopPolicies(): Promise<ShopPolicies> {
  const data = await storefrontRequest<{ shop: ShopPolicies }>({ query: SHOP_POLICIES_QUERY });
  return data.shop;
}
