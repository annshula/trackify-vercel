'use client';

import * as React from 'react';

/** Thin scroll-progress line pinned above the fixed header — the compact, modern "reading bar" pattern. */
export function ReadingProgress() {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const max = scrollHeight - clientHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-70 h-0.5" aria-hidden="true">
      <div className="h-full bg-ink" style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
