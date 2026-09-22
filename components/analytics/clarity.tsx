"use client";

import { useEffect } from "react";

/** Module-level so React's double-invoked dev effect can't init twice. */
let started = false;

/**
 * Runs a callback once the browser is idle (or after a timeout fallback for
 * browsers without requestIdleCallback), returning a cleanup that cancels it
 * if the component unmounts first.
 */
function onIdle(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const ric = window.requestIdleCallback;
  if (ric) {
    const id = ric(callback, { timeout: 4000 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(callback, 1);
  return () => window.clearTimeout(id);
}

/**
 * Microsoft Clarity — heatmaps and session replay. Imported dynamically and
 * started only once the page is idle, so it never competes with first paint.
 * Runs only in the browser, and only when NEXT_PUBLIC_CLARITY_PROJECT_ID is
 * set, so local runs and previews without the id stay out of the production
 * project's data.
 */
export function ClarityAnalytics() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  useEffect(() => {
    if (!projectId || started) return;
    started = true;
    // Session replay is the heaviest script on the page and none of it
    // matters before the visitor can interact: hold both the chunk and its
    // init off the load window.
    return onIdle(() => {
      void import("@microsoft/clarity").then(({ default: Clarity }) =>
        Clarity.init(projectId),
      );
    });
  }, [projectId]);

  return null;
}
