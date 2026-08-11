'use client';

/**
 * Root error boundary.
 *
 * Replaces the whole document, so it must render its own <html>/<body> and
 * cannot rely on the app's stylesheet or fonts having loaded. Styles are
 * inline for that reason.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          background: '#faf9f7',
          color: '#0c0a09',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 500, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: '0.75rem', lineHeight: 1.6, color: '#57534e' }}>
            The page could not be loaded. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '1.75rem',
              minHeight: '2.75rem',
              padding: '0 1.5rem',
              borderRadius: '10px',
              border: 'none',
              background: '#1c1917',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#78716c' }}>
              Reference code {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
