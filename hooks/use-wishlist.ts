'use client';

import * as React from 'react';
import { useLocalStorage } from './use-local-storage';

const KEY = 'tf_wishlist';
const MAX = 200;

/**
 * Wishlist.
 *
 * Stored as product handles in localStorage for guests. Shopify has no
 * universal customer wishlist primitive for headless storefronts; the
 * Shopify-native option is a customer metafield, which requires a
 * `write_customers`-scoped Admin call per change.
 *
 * `syncToShopify` below is the single seam where that upgrade plugs in — the
 * UI does not change. Until it is enabled the wishlist is honestly local, and
 * the UI says so rather than implying a synced account feature.
 */
export function useWishlist() {
  const { value, setValue, hydrated } = useLocalStorage<string[]>(KEY, []);

  const has = React.useCallback((handle: string) => value.includes(handle), [value]);

  const toggle = React.useCallback(
    (handle: string) => {
      let added = false;
      setValue((current) => {
        if (current.includes(handle)) return current.filter((item) => item !== handle);
        added = true;
        return [handle, ...current].slice(0, MAX);
      });
      return added;
    },
    [setValue],
  );

  const remove = React.useCallback(
    (handle: string) => setValue((current) => current.filter((item) => item !== handle)),
    [setValue],
  );

  const clear = React.useCallback(() => setValue([]), [setValue]);

  return { handles: value, has, toggle, remove, clear, hydrated } as const;
}
