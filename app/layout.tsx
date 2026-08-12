import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

import { rootMetadata } from "@/lib/seo/metadata";
import { JsonLd, organizationSchema, websiteSchema } from "@/lib/seo/jsonld";
import { publicEnv } from "@/lib/validation/env";
import {
  getFooterCollections,
  getNavigation,
  getPopularSearches,
} from "@/lib/navigation";

import { ToastProvider } from "@/components/ui/toast";
import { CartProvider } from "@/components/cart/cart-provider";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ConsentBanner } from "@/components/layout/consent-banner";
import { PageView } from "@/components/analytics/page-view";

/**
 * Root layout.
 *
 * Deliberately reads only the local catalog — never cookies. Reading cookies
 * here would opt every route in the app into dynamic rendering, costing static
 * generation on product and collection pages and turning `notFound()` into a
 * soft 404. Cart and session are hydrated by CartProvider from /api/cart.
 */

// Self-hosted at build time — no render-blocking request to Google's CDN.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

// Sora — geometric display for headings; pairs with Inter for a clean, modern
// ecommerce look. Self-hosted at build time via next/font.
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never cap zoom — pinch-to-zoom is an accessibility requirement.
  maximumScale: 5,
  viewportFit: "cover",
  // Light-only theme — the app intentionally ships no dark mode.
  themeColor: "#faf9f7",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navigation, popularSearches, footerCollections] = await Promise.all([
    getNavigation(),
    getPopularSearches(),
    getFooterCollections(),
  ]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${sora.variable}`}
    >
      <head />
      <body suppressHydrationWarning>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />

        <ToastProvider>
          <CartProvider>
            <Header navigation={navigation} popularSearches={popularSearches} />

            {/* Top padding clears the now-fixed header (see header.tsx); the
                homepage hero cancels it again with a matching negative
                margin so it can sit flush with the true top of the
                viewport. Navigation on mobile is the hamburger drawer only —
                no separate bottom tab bar duplicating it. */}
            <main id="main" className="min-h-[60vh] pt-16 sm:pt-18">
              {children}
            </main>

            <Footer collections={footerCollections} />
            <CartDrawer />
          </CartProvider>
        </ToastProvider>

        <PageView />
        <ConsentBanner
          ga4Id={publicEnv.ga4Id}
          metaPixelId={publicEnv.metaPixelId}
        />
      </body>
    </html>
  );
}
