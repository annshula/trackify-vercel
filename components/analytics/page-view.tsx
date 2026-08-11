'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { track } from '@/lib/analytics';

/**
 * Fires a page_view on every client navigation.
 *
 * GA4's automatic page_view is disabled in the loader (send_page_view:false)
 * because it does not observe App Router transitions.
 */
function PageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const query = searchParams.toString();
    track('page_view', {
      page_path: query ? `${pathname}?${query}` : pathname,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export function PageView() {
  // useSearchParams needs a Suspense boundary to avoid opting the whole tree
  // into client-side rendering.
  return (
    <React.Suspense fallback={null}>
      <PageViewInner />
    </React.Suspense>
  );
}
