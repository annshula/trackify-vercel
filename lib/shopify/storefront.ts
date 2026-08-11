import 'server-only';
import { graphqlRequest, type GraphQLRequest } from './client';
import { serverEnv } from '@/lib/validation/env';

/**
 * ShopifyStorefrontService — live commerce.
 *
 * Reached only from server actions and route handlers. The public Storefront
 * token stays on the server so we can rate-limit and validate every call.
 */
export async function storefrontRequest<TData, TVariables = Record<string, unknown>>(
  request: GraphQLRequest<TVariables> & { buyerIp?: string },
): Promise<TData> {
  const env = serverEnv();
  const headers: Record<string, string> = {
    'X-Shopify-Storefront-Access-Token': env.storefrontToken,
  };
  // Forwarding the buyer IP keeps Shopify's per-buyer rate limits accurate.
  if (request.buyerIp) headers['Shopify-Storefront-Buyer-IP'] = request.buyerIp;

  return graphqlRequest<TData, TVariables>(env.storefrontEndpoint, headers, 'storefront', {
    // Cart state must never be served from a shared cache.
    cache: 'no-store',
    ...request,
  });
}
