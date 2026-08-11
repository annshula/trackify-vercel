import 'server-only';
import { ShopifyError } from './errors';

export type GraphQLRequest<V> = {
  query: string;
  variables?: V;
  /** Next.js cache directives. Customer/cart calls must pass `cache: 'no-store'`. */
  cache?: RequestCache;
  revalidate?: number | false;
  tags?: string[];
  /** Total attempts including the first. Retries only on 429/5xx/network. */
  retries?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string; extensions?: Record<string, unknown> }[];
  extensions?: { cost?: { throttleStatus?: { currentlyAvailable: number; maximumAvailable: number } } };
};

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One GraphQL transport shared by all three Shopify APIs.
 *
 * Handles: timeouts, bounded retry with jittered backoff, Retry-After,
 * throttle awareness, and error normalization. Never logs credentials.
 */
export async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  endpoint: string,
  headers: Record<string, string>,
  api: 'admin' | 'storefront' | 'customer',
  request: GraphQLRequest<TVariables>,
): Promise<TData> {
  const maxAttempts = Math.max(1, request.retries ?? 3);
  const timeoutMs = request.timeoutMs ?? 15_000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
    // Caller-supplied cancellation must also abort the in-flight fetch.
    const onExternalAbort = () => timeoutController.abort();
    request.signal?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const nextOptions: { revalidate?: number | false; tags?: string[] } = {};
      if (request.revalidate !== undefined) nextOptions.revalidate = request.revalidate;
      if (request.tags) nextOptions.tags = request.tags;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
        body: JSON.stringify({ query: request.query, variables: request.variables ?? {} }),
        signal: timeoutController.signal,
        ...(request.cache ? { cache: request.cache } : {}),
        ...(Object.keys(nextOptions).length > 0 ? { next: nextOptions } : {}),
      });

      const requestId = response.headers.get('x-request-id');

      if (!response.ok) {
        if (RETRYABLE_STATUS.has(response.status) && attempt < maxAttempts) {
          const retryAfter = Number.parseFloat(response.headers.get('retry-after') ?? '');
          const backoff = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : 2 ** (attempt - 1) * 500 + Math.random() * 250;
          await sleep(backoff);
          continue;
        }
        const bodyText = await response.text().catch(() => '');
        throw new ShopifyError(
          `Shopify ${api} API responded ${response.status} ${response.statusText}`,
          {
            api,
            status: response.status,
            requestId,
            graphQLErrors: bodyText ? [{ message: bodyText.slice(0, 500) }] : [],
          },
        );
      }

      const payload = (await response.json()) as GraphQLResponse<TData>;

      if (payload.errors?.length) {
        const throttled = payload.errors.some(
          (e) => (e.extensions?.code as string | undefined) === 'THROTTLED',
        );
        if (throttled && attempt < maxAttempts) {
          await sleep(2 ** attempt * 750 + Math.random() * 500);
          continue;
        }
        throw new ShopifyError(payload.errors.map((e) => e.message).join('; '), {
          api,
          status: response.status,
          requestId,
          graphQLErrors: payload.errors,
        });
      }

      if (!payload.data) {
        throw new ShopifyError(`Shopify ${api} API returned no data`, { api, status: response.status, requestId });
      }

      return payload.data;
    } catch (error) {
      lastError = error;
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const isNetwork = error instanceof TypeError;
      if ((isAbort || isNetwork) && attempt < maxAttempts && !request.signal?.aborted) {
        await sleep(2 ** (attempt - 1) * 400 + Math.random() * 200);
        continue;
      }
      if (error instanceof ShopifyError) throw error;
      throw new ShopifyError(
        isAbort ? `Shopify ${api} API request timed out after ${timeoutMs}ms` : `Shopify ${api} API request failed`,
        { api, cause: error },
      );
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new ShopifyError(`Shopify ${api} API request failed`, { api });
}
