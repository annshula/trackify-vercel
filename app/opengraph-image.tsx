import { readFileSync } from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { publicEnv } from "@/lib/validation/env";

/**
 * Default social-share preview.
 *
 * This is the fallback Next.js serves for any URL that doesn't define its
 * own opengraph-image (i.e. every page except products/collections, which
 * already export real catalog photos via lib/seo/metadata.ts) — so this is
 * what actually renders when the homepage, an account page, or the site
 * root itself gets pasted into iMessage, Slack, X, WhatsApp, Discord, etc.
 *
 * Built as a route (not a static PNG in /public) so it always resolves to
 * an absolute URL under whatever domain is actually serving the site
 * (metadataBase in lib/seo/metadata.ts) — the preview keeps working if the
 * domain ever changes, with nothing to manually re-export.
 *
 * Node runtime, not edge: the logo is read straight off disk via fs, which
 * the edge runtime cannot do.
 */
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${publicEnv.siteName} — Smart. Secure. Seamless.`;

function whiteLogoDataUri(): string {
  const svg = readFileSync(
    path.join(process.cwd(), "public", "logo.svg"),
    "utf8",
  )
    .replace(/fill="#CC1D1D"/g, 'fill="#FFFFFF"')
    .replace(/fill="black"/g, 'fill="#FFFFFF"');
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default function OpengraphImage() {
  const logo = whiteLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0c0a09",
          backgroundImage:
            "radial-gradient(circle at 50% 38%, #232019 0%, #14120f 55%, #0c0a09 100%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={132} height={100} alt="" />
        <div
          style={{
            marginTop: 28,
            fontSize: 96,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          {publicEnv.siteName}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 34,
            fontWeight: 500,
            color: "#a9bb8e",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Smart · Secure · Seamless
        </div>
      </div>
    ),
    { ...size },
  );
}
