import "server-only";
import { graphqlRequest, type GraphQLRequest } from "./client";
import { getAdminAccessToken } from "./admin-token";
import { serverEnv } from "@/lib/validation/env";

/**
 * ShopifyAdminService — privileged, server-only.
 *
 * Used by the sync pipeline, webhook processing and diagnostics. The one
 * exception is `services/shopify/order-actions-service.ts`, which lets a
 * customer trigger `orderCancel` (no Customer Account API equivalent
 * exists) — but only after re-fetching that exact order through the
 * customer-scoped API first, so an id belonging to another customer never
 * reaches this client. No other customer-facing route handler should call
 * this directly.
 *
 * Authentication is resolved per call: either the static custom-app token or a
 * 24h token obtained via the client credentials grant (cached in-process).
 */
export async function adminRequest<TData, TVariables = Record<string, unknown>>(
  request: GraphQLRequest<TVariables>,
): Promise<TData> {
  const env = serverEnv();
  const adminToken = await getAdminAccessToken();
  return graphqlRequest<TData, TVariables>(
    env.adminEndpoint,
    { "X-Shopify-Access-Token": adminToken },
    "admin",
    // Admin data is authoritative and always fetched fresh.
    { cache: "no-store", timeoutMs: 30_000, ...request },
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
  options: {
    pageSize?: number;
    variables?: Record<string, unknown>;
    onPage?: (nodes: TNode[], page: number) => void;
  } = {},
): Promise<TNode[]> {
  type Connection = { nodes: TNode[]; pageInfo: PageInfo };

  const pageSize = options.pageSize ?? 50;
  const collected: TNode[] = [];
  let after: string | null = null;
  let page = 0;

  for (;;) {
    const data: Record<string, Connection> = await adminRequest<
      Record<string, Connection>
    >({
      query,
      variables: { first: pageSize, after, ...options.variables },
    });

    const connection: Connection | undefined = data[connectionKey];
    if (!connection) {
      throw new Error(
        `Admin response did not contain connection "${connectionKey}"`,
      );
    }

    page += 1;
    collected.push(...connection.nodes);
    options.onPage?.(connection.nodes, page);

    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor)
      break;
    after = connection.pageInfo.endCursor;
  }

  return collected;
}
