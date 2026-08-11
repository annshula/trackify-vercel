'use client';

import * as React from 'react';
import { MoonIcon, SunIcon } from '@/components/ui/icons';

type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'tf_theme';

/**
 * Three-state theme control: light, dark, or follow the OS.
 *
 * "system" removes the data-theme attribute entirely so the CSS
 * prefers-color-scheme rules take over — it is not a fourth palette.
 *
 * The current value is read from the DOM (which ThemeScript already set before
 * first paint) via useSyncExternalStore, so there is no hydration mismatch and
 * no state update on mount.
 */

const themeListeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function readTheme(): Theme {
  const attribute = document.documentElement.getAttribute('data-theme');
  return attribute === 'light' || attribute === 'dark' ? attribute : 'system';
}

export function ThemeToggle() {
  const theme = React.useSyncExternalStore(
    subscribe,
    readTheme,
    // Server render assumes "system": nothing is stored yet from its point of view.
    () => 'system' as Theme,
  );

  const apply = (next: Theme) => {
    const root = document.documentElement;
    if (next === 'system') {
      root.removeAttribute('data-theme');
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      root.setAttribute('data-theme', next);
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    for (const listener of themeListeners) listener();
  };

  const cycle = () => {
    const order: Theme[] = ['system', 'light', 'dark'];
    apply(order[(order.indexOf(theme) + 1) % order.length] ?? 'system');
  };

  const label =
    theme === 'system'
      ? 'Theme: follows your system'
      : theme === 'light'
        ? 'Theme: light'
        : 'Theme: dark';

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label}. Activate to change.`}
      title={label}
      className="grid size-11 place-items-center rounded-md text-ink transition-colors hover:bg-surface-sunken"
    >
      {theme === 'dark' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
    </button>
  );
}

/**
 * Applies the stored theme before first paint.
 *
 * Inline and synchronous on purpose — anything async produces a flash of the
 * wrong palette on every navigation into the app.
 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} suppressHydrationWarning />;
}
