"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Minimal shape of the fbq stub the loader snippet installs on `window`. */
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Meta (Facebook) Pixel — conversion tracking for ads. Loads only in the
 * browser, only when NEXT_PUBLIC_META_PIXEL_ID is set, so local runs and
 * previews without the id stay out of the production pixel's data.
 *
 * The loader snippet fires the first PageView itself. App Router navigations
 * are client-side, so no further page loads happen and the effect below
 * sends PageView for each subsequent route change — Meta's `PageView` isn't
 * one of the standard events lib/analytics's dispatch() maps page_view onto,
 * so this is the only place it's sent, unlike GA4 (see google-analytics.tsx).
 */
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();
  /** Skips the initial render — the loader snippet already sent that one. */
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!pixelId) return;
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pixelId, pathname]);

  if (!pixelId) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="lazyOnload">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
