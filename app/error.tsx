'use client';

import * as React from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { AlertIcon } from '@/components/ui/icons';

/**
 * Route-level error boundary.
 *
 * The customer sees a recoverable message; the actual error goes to the server
 * logs. `digest` is shown so a support conversation can be tied to a log entry
 * without exposing a stack trace.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[route error]', error.message, error.digest);
  }, [error]);

  return (
    <div className="container-page">
      <div className="mx-auto flex max-w-lg flex-col items-center py-20 text-center sm:py-28">
        <span className="mb-6 grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
          <AlertIcon size={26} />
        </span>

        <h1 className="text-3xl">Something went wrong</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          This is on us, not you. Try again — if it keeps happening, get in touch and we will sort
          it out.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={reset} size="lg">
            Try again
          </Button>
          <ButtonLink href="/" variant="outline" size="lg">
            Back home
          </ButtonLink>
        </div>

        {error.digest && (
          <p className="mt-8 text-xs text-ink-subtle">
            Reference code <code className="rounded-xs bg-surface-sunken px-1.5 py-0.5">{error.digest}</code>
          </p>
        )}
      </div>
    </div>
  );
}
