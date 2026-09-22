import Script from "next/script";

/**
 * Google Tag Manager — the site's tag-management container.
 *
 * The loader runs with `beforeInteractive`, which the server injects into the
 * initial HTML's <head> before any Next.js module — as high in the head as
 * possible. The required <noscript> fallback (the iframe Google serves to
 * no-JS visitors) renders right here, so this component must stay the FIRST
 * child of <body> in the root layout.
 *
 * Unlike the other providers in this folder, GTM has no consent gate and no
 * fallback container: it is a tag-management shell, not ad tracking on its
 * own, and simply does not render when NEXT_PUBLIC_GTM_ID is unset.
 */
export function GTM() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  if (!gtmId) return null;

  return (
    <>
      <Script id="google-tag-manager" strategy="beforeInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
          aria-hidden="true"
        />
      </noscript>
    </>
  );
}
