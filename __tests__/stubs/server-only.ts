/**
 * Vitest stub for the `server-only` package.
 *
 * The real package throws on import to stop server code leaking into a client
 * bundle. That guard is a bundler concern; under Vitest these modules genuinely
 * do run on the server, so importing it must be a no-op.
 */
export {};
