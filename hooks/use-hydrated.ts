'use client';

import * as React from 'react';

const emptySubscribe = () => () => {};

/**
 * True only after hydration.
 *
 * `useSyncExternalStore` is the right primitive for this: it gives React an
 * explicit server snapshot (false) and client snapshot (true), so there is no
 * setState-in-effect and no cascading render on mount.
 *
 * Use it for anything that must not render until the DOM exists — portals,
 * values read from localStorage, media queries.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
