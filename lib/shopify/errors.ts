export type GraphQLUserError = {
  field?: string[] | null;
  message: string;
  code?: string | null;
};

export class ShopifyError extends Error {
  readonly api: 'admin' | 'storefront' | 'customer';
  readonly status: number | null;
  readonly graphQLErrors: { message: string }[];
  readonly userErrors: GraphQLUserError[];
  readonly requestId: string | null;

  constructor(
    message: string,
    options: {
      api: ShopifyError['api'];
      status?: number | null;
      graphQLErrors?: { message: string }[];
      userErrors?: GraphQLUserError[];
      requestId?: string | null;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.name = 'ShopifyError';
    this.api = options.api;
    this.status = options.status ?? null;
    this.graphQLErrors = options.graphQLErrors ?? [];
    this.userErrors = options.userErrors ?? [];
    this.requestId = options.requestId ?? null;
  }

  /** Safe to show a customer — never leaks internals. */
  get customerMessage(): string {
    const first = this.userErrors[0]?.message;
    return first ?? 'Something went wrong on our side. Please try again.';
  }
}

export class UnauthenticatedError extends Error {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

/** Collapses Shopify userErrors into a single customer-safe string. */
export function firstUserError(errors: GraphQLUserError[] | null | undefined): string | null {
  if (!errors || errors.length === 0) return null;
  return errors[0]?.message ?? null;
}
