import 'server-only';
import { graphqlRequest, type GraphQLRequest } from './client';
import { serverEnv } from '@/lib/validation/env';

/**
 * ShopifyAdminService — privileged, server-only.
 *
 * Used exclusively by the sync pipeline, webhook processing and diagnostics.
 * Never reachable from a customer-facing route handler.
 */
export async function adminRequest<TData, TVariables = Record<string, unknown>>(
  request: GraphQLRequest<TVariables>,
): Promise<TData> {
  const env = serverEnv();
  return graphqlRequest<TData, TVariables>(
    env.adminEndpoint,
    { 'X-Shopify-Access-Token': env.adminToken },
    'admin',
    // Admin data is authoritative and always fetched fresh.
    { cache: 'no-store', timeoutMs: 30_000, ...request },
  );
}

export type PageInfo = { hasNextPage: boolean; endCursor: string | null };

/**
 * Walks a Relay connection to completion.
 * `pageSize` is kept modest so a single page stays inside the Admin API cost budget.
 */
export async function paginateAdmin<TNode>(
  query: string,
  connectionKey: string,
  options: { pageSize?: number; variables?: Record<string, unknown>; onPage?: (nodes: TNode[], page: number) => void } = {},
): Promise<TNode[]> {
  type Connection = { nodes: TNode[]; pageInfo: PageInfo };

  const pageSize = options.pageSize ?? 50;
  const collected: TNode[] = [];
  let after: string | null = null;
  let page = 0;

  for (;;) {
    const data: Record<string, Connection> = await adminRequest<Record<string, Connection>>({
      query,
      variables: { first: pageSize, after, ...options.variables },
    });

    const connection: Connection | undefined = data[connectionKey];
    if (!connection) {
      throw new Error(`Admin response did not contain connection "${connectionKey}"`);
    }

    page += 1;
    collected.push(...connection.nodes);
    options.onPage?.(connection.nodes, page);

    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) break;
    after = connection.pageInfo.endCursor;
  }

  return collected;
}
