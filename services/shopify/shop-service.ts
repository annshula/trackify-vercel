import 'server-only';
import { storefrontRequest } from '@/lib/shopify/storefront';
import { adminRequest } from '@/lib/shopify/admin';
import { SHOP_POLICIES_QUERY } from '@/lib/shopify/queries/storefront';
import { SHOP_CONTACT_QUERY } from '@/lib/shopify/queries/admin';
import { isAdminAuthConfigured } from '@/lib/validation/env';

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

export type ShopContact = {
  email: string | null;
  phone: string | null;
  address: {
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    zip: string | null;
    country: string | null;
  } | null;
};

type RawShopContact = {
  shop: {
    email: string | null;
    billingAddress: {
      phone: string | null;
      address1: string | null;
      address2: string | null;
      city: string | null;
      province: string | null;
      zip: string | null;
      country: string | null;
      countryCodeV2: string | null;
    } | null;
  };
};

/**
 * The merchant's real store details (Settings → Store details) for the
 * "Contact us" page. Only the Admin API exposes these — the Storefront API's
 * `shop` type has no email/phone/address fields. Null when the Admin API
 * isn't configured or the call fails, so the page falls back to its static
 * copy rather than breaking.
 */
export async function getShopContact(): Promise<ShopContact | null> {
  if (!isAdminAuthConfigured()) return null;

  try {
    const data = await adminRequest<RawShopContact>({ query: SHOP_CONTACT_QUERY });
    const { shop } = data;
    const billing = shop.billingAddress;

    return {
      email: shop.email,
      phone: billing?.phone ?? null,
      address: billing
        ? {
            address1: billing.address1,
            address2: billing.address2,
            city: billing.city,
            province: billing.province,
            zip: billing.zip,
            country: billing.country,
          }
        : null,
    };
  } catch (error) {
    console.warn('[shop] could not load store contact details:', (error as Error).message);
    return null;
  }
}
