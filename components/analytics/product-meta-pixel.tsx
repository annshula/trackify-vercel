"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * Per-product Meta Pixel — inits a second pixel from the product's
 * `custom.meta_pixel_id` metafield, alongside the global pixel from
 * MetaPixel (components/analytics/meta-pixel.tsx). Lets a merchant route a
 * specific product's ad conversions to its own ad account/pixel without
 * losing site-wide tracking on the global one.
 *
 * fbq requires `trackSingle`/`trackSingleCustom` once more than one pixel is
 * inited — a plain `fbq('track', ...)` fires to every inited pixel. See
 * lib/analytics/index.ts's dispatch(), which reads this pixel id back out of
 * the same metafield to route ecommerce events here with trackSingle.
 *
 * `pixelId` comes from a merchant-editable Shopify metafield, not a build-time
 * env var — treat it as untrusted input. It's validated against Meta's pixel
 * id format (digits only) before it ever reaches the inline script or the
 * noscript <img> src, so a metafield set to something like `'); alert(1); //`
 * can't break out of the script string or an attribute.
 */
const PIXEL_ID_PATTERN = /^[0-9]{6,20}$/;

export function ProductMetaPixel({ pixelId: rawPixelId }: { pixelId: string | null }) {
  const pixelId = rawPixelId && PIXEL_ID_PATTERN.test(rawPixelId) ? rawPixelId : null;
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (!pixelId) return;
    if (!bootstrapped.current) {
      bootstrapped.current = true;
      return;
    }
    // Route changes are handled by MetaPixel's PageView; ViewContent for this
    // product is sent by purchase-context's view_item, via dispatch().
  }, [pixelId]);

  if (!pixelId) return null;

  return (
    <>
      <Script id="product-meta-pixel" strategy="lazyOnload">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=ViewContent&noscript=1`}
        />
      </noscript>
    </>
  );
}
