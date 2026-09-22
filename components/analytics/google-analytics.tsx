import Script from "next/script";

/**
 * Google Analytics 4 — gtag.js measurement for traffic and conversions.
 * Loads only in the browser, only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set,
 * so local runs and previews without the id stay out of production data.
 *
 * send_page_view stays false: PageView (see components/analytics/page-view)
 * already sends a page_view on every route change, App Router included, by
 * fanning out through lib/analytics's dispatch() to gtag('event', 'page_view',
 * …) — letting gtag's own automatic page_view run too would double-count
 * every view. This component's only job is loading and initializing gtag;
 * pathname changes need no effect here.
 */
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId) return null;

  return (
    <>
      <Script
        id="google-analytics"
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script id="google-analytics-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}', { send_page_view: false });`}
      </Script>
    </>
  );
}
