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

export type ShopAddress = {
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  country: string | null;
};

export type ShopContact = {
  email: string | null;
  phone: string | null;
  address: ShopAddress | null;
};

export type ShopCatalog = {
  version: number;
  generatedAt: string;
  contact: ShopContact;
  policies: ShopPolicies;
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
