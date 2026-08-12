"use client";

import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/lib/analytics/consent-store";
import { useHydrated } from "@/hooks/use-hydrated";

/**
 * Consent gate + analytics loader.
 *
 * No third-party script is injected until the visitor opts in — the tags are
 * mounted conditionally, not merely put in "denied" mode.
 */
export function ConsentBanner({
  ga4Id,
  metaPixelId,
}: {
  ga4Id: string;
  metaPixelId: string;
}) {
  const { consent, setConsent } = useConsent();
  const hydrated = useHydrated();

  // Nothing to consent to means nothing to ask about.
  if (!ga4Id && !metaPixelId) return null;

  return (
    <>
      {consent?.analytics && ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('consent','default',{ad_storage:'${consent.marketing ? "granted" : "denied"}',analytics_storage:'granted'});gtag('config','${ga4Id}',{send_page_view:false});`}
          </Script>
        </>
      )}

      {consent?.marketing && metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
        </Script>
      )}

      {hydrated && consent === null && (
        <div
          role="region"
          aria-label="Cookie preferences"
          className="fixed inset-x-0 bottom-0 z-55 animate-slide-up border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom,0px)] shadow-e4"
        >
          <div className="container-page flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-5">
            <p className="max-w-2xl text-sm text-ink-muted">
              We use cookies to understand how the store is used and to improve
              it. You can decline without losing any shopping features.{" "}
              <Link
                href="/pages/privacy"
                className="text-ink underline underline-offset-4"
              >
                Privacy
              </Link>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setConsent({ analytics: false, marketing: false })
                }
              >
                Decline
              </Button>
              <Button
                onClick={() => setConsent({ analytics: true, marketing: true })}
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
