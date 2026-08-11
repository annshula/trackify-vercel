'use client';

import * as React from 'react';
import { useLocalStorage } from './use-local-storage';

const KEY = 'tf_recently_viewed';
const MAX = 12;

/**
 * Recently viewed products.
 *
 * Stores handles only — no Shopify request, no PII, a few hundred bytes. The
 * product data itself is resolved from the local catalog on the server.
 */
export function useRecentlyViewed() {
  const { value, setValue, hydrated } = useLocalStorage<string[]>(KEY, []);

  const record = React.useCallback(
    (handle: string) => {
      if (!handle) return;
      setValue((current) => [handle, ...current.filter((item) => item !== handle)].slice(0, MAX));
    },
    [setValue],
  );

  const clear = React.useCallback(() => setValue([]), [setValue]);

  return { handles: value, record, clear, hydrated } as const;
}

/** Records a view once per mount. Rendered on the product page. */
export function RecentlyViewedRecorder({ handle }: { handle: string }) {
  const { record } = useRecentlyViewed();
  React.useEffect(() => {
    record(handle);
  }, [handle, record]);
  return null;
}
