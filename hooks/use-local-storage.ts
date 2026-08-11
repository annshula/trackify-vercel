'use client';

import * as React from 'react';

/**
 * localStorage-backed state that stays in sync across tabs and across
 * components in the same tab.
 *
 * Built on `useSyncExternalStore` rather than useState + useEffect: React gets
 * an explicit server snapshot, so the first render matches the server exactly
 * and the stored value is adopted during hydration without a cascading render.
 *
 * getSnapshot must return a stable reference, so parsed values are memoized per
 * key and only re-parsed when the raw string actually changes.
 */

type CacheEntry = { raw: string | null; parsed: unknown };

const cache = new Map<string, CacheEntry>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string): void {
  for (const listener of listeners.get(key) ?? []) listener();
}

function subscribe(key: string, listener: () => void): () => void {
  let bucket = listeners.get(key);
  if (!bucket) {
    bucket = new Set();
    listeners.set(key, bucket);
  }
  bucket.add(listener);

  // A same-tab write does not fire `storage`, so a custom event covers it.
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      cache.delete(key);
      listener();
    }
  };
  const onLocal = (event: Event) => {
    if ((event as CustomEvent<{ key: string }>).detail?.key === key) listener();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener('tf:storage', onLocal);

  return () => {
    bucket.delete(listener);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('tf:storage', onLocal);
  };
}

function readSnapshot<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    // Storage disabled (private mode, blocked cookies) — behave as if empty.
    return fallback;
  }

  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.parsed as T;

  let parsed: unknown = fallback;
  if (raw !== null) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = fallback;
    }
  }

  cache.set(key, { raw, parsed });
  return parsed as T;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Kept in a ref so a caller passing an inline object literal does not change
  // the snapshot identity on every render.
  const fallbackRef = React.useRef(initialValue);

  const value = React.useSyncExternalStore(
    React.useCallback((listener: () => void) => subscribe(key, listener), [key]),
    React.useCallback(() => readSnapshot<T>(key, fallbackRef.current), [key]),
    React.useCallback(() => fallbackRef.current, []),
  );

  const hydrated = React.useSyncExternalStore(
    React.useCallback(() => () => {}, []),
    () => true,
    () => false,
  );

  const setValue = React.useCallback(
    (next: T | ((current: T) => T)) => {
      const current = readSnapshot<T>(key, fallbackRef.current);
      const resolved = typeof next === 'function' ? (next as (c: T) => T)(current) : next;
      try {
        const raw = JSON.stringify(resolved);
        window.localStorage.setItem(key, raw);
        cache.set(key, { raw, parsed: resolved });
      } catch {
        // Quota exceeded or storage disabled — keep it in the cache only, so
        // the UI still reflects the change for this session.
        cache.set(key, { raw: null, parsed: resolved });
      }
      notify(key);
      window.dispatchEvent(new CustomEvent('tf:storage', { detail: { key } }));
    },
    [key],
  );

  return { value, setValue, hydrated } as const;
}
