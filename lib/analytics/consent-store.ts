'use client';

import * as React from 'react';
import { flushQueue, readConsent, writeConsent, type ConsentState } from './index';

/**
 * Consent as an external store.
 *
 * Every component that needs the consent state subscribes to the same source,
 * so the banner, the settings page and the analytics loader can never disagree.
 * Reading through useSyncExternalStore also means no setState on mount.
 */

const listeners = new Set<() => void>();

/** getSnapshot must be referentially stable, so the parsed value is cached. */
let snapshot: ConsentState | null = null;
let initialized = false;

function currentSnapshot(): ConsentState | null {
  if (!initialized) {
    snapshot = readConsent();
    initialized = true;
  }
  return snapshot;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onExternal = () => {
    snapshot = readConsent();
    for (const l of listeners) l();
  };
  window.addEventListener('tf:consent', onExternal);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('tf:consent', onExternal);
  };
}

export function useConsent(): {
  consent: ConsentState | null;
  setConsent: (next: ConsentState) => void;
} {
  const consent = React.useSyncExternalStore(
    subscribe,
    currentSnapshot,
    // The server cannot know a browser-local choice.
    () => null,
  );

  const setConsent = React.useCallback((next: ConsentState) => {
    snapshot = next;
    initialized = true;
    // writeConsent dispatches tf:consent, which notifies every subscriber.
    writeConsent(next);
    if (next.analytics) flushQueue();
  }, []);

  return { consent, setConsent };
}
