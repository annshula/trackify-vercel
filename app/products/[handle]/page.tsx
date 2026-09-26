import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";

import { productRepository, redirectRepository } from "@/lib/catalog";
import { shopRepository } from "@/lib/catalog/shop";
import { productRating } from "@/lib/catalog/selectors";
import { productMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbSchema, productSchema } from "@/lib/seo/jsonld";

import { Breadcrumb } from "@/components/ui/primitives";
import { Reviews, reviewProvider } from "@/components/product/reviews";
import { ComparisonTable } from "@/components/product/comparison-table";
import { RecentlyViewedRecorder } from "@/hooks/use-recently-viewed";
import { PurchaseProvider } from "@/components/pdp/purchase-context";
import { ProductGallery } from "@/components/pdp/product-gallery";
import { PurchasePanel, type Reassurance } from "@/components/pdp/purchase-panel";
import {
  HowItWorks,
  ProblemSolution,
  ProductBenefits,
  ProductDemo,
  ProductFeatures,
  UseCases,
} from "@/components/pdp/story-sections";
import { ProductDetails, ProductFAQ, ReturnsGuarantee } from "@/components/pdp/detail-sections";
import { FinalCTA } from "@/components/pdp/final-cta";
import { StickyAddToCart } from "@/components/pdp/sticky-add-to-cart";
import { AnnouncementBar } from "@/components/pdp/announcement-bar";
import { ProductMetaPixel } from "@/components/analytics/product-meta-pixel";

/**
 * /products/[handle]
 *
 * Rendered entirely from the synced catalog (products.json + shop.json) — no
 * Shopify request to render, only to transact. Every section's copy lives in
 * Shopify metafields/metaobjects (see scripts/pdp-content/ and
 * CatalogPdpContent); a section with no data renders nothing, so a product
 * without editorial content still gets a clean hero → reviews → details page.
 *
 * Order follows the first-time visitor's questions: what is it and how do I
 * buy it (hero) → why would I want it (benefits, story, features) → how does
 * it work, where would I use it → do other people like it (reviews) → what
 * exactly do I get, when, and what if it's wrong (details, trust, FAQ) → buy.
 */

export const revalidate = 3600;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateStaticParams() {
  const products = await productRepository.getAllProducts();
  return products.map((product) => ({ handle: product.handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = await productRepository.getProductByHandle(handle);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  return productMetadata(product);
}

export default async function ProductPage({ params }: PageProps) {
  const { handle } = await params;
  const product = await productRepository.getProductByHandle(handle);

  if (!product) {
    // The handle may have changed in Shopify — follow the recorded rename.
    const current = await redirectRepository.resolveProduct(handle);
    if (current) permanentRedirect(`/products/${current}`);
    notFound();
  }

  const [shopPdp, contact, liveReviews] = await Promise.all([
    shopRepository.getPdpContent(),
    shopRepository.getContact(),
    // Same cached Judge.me request the reviews section makes, so the hero
    // count always matches the section below it (the synced metafield lags).
    reviewProvider?.list(product.handle).catch(() => null) ?? null,
  ]);
  const rating =
    liveReviews && liveReviews.total > 0
      ? { value: liveReviews.average, count: liveReviews.total }
      : productRating(product);
  const { pdp } = product;
  const subtitle = product.metafields["custom.subtitle"] ?? null;
  const ctaHeadline = product.metafields["custom.cta_headline"] ?? `Ready to try the ${product.title}?`;
  // Short filled-tick benefit lines directly under the title — a plain JSON
  // array of strings (custom.perks), separate from custom.benefits' richer
  // icon+label+body cards further down the page. Malformed/missing metafield
  // yields no perks rather than breaking the page.
  const perks: string[] = (() => {
    const raw = product.metafields["custom.perks"];
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
    } catch {
      return [];
    }
  })();

  // The store's own guarantees as an icon strip under the buy buttons — short
  // labels only; the shipping cost note is already covered by the "calculated
  // at checkout" line under the price.
  const { trustPoints } = shopPdp;
  // A product's own delivery estimate (custom.delivery_estimate) beats the
  // store-wide one — both the buy panel and the specs section read this.
  const shipping = {
    ...shopPdp.shipping,
    deliveryEstimate: product.metafields["custom.delivery_estimate"]?.trim() || shopPdp.shipping.deliveryEstimate,
  };
  const reassurance: Reassurance[] = trustPoints
    .slice(0, 4)
    .map((point) => ({ icon: point.icon, label: point.label }));

  const primaryCollection = product.collections[0];
  const crumbs = [
    { href: "/", label: "Home" },
    primaryCollection
      ? { href: `/collections/${primaryCollection.handle}`, label: primaryCollection.title }
      : { href: "/collections", label: "Shop" },
    { label: product.title },
  ];

  return (
    <>
      <JsonLd
        data={[
          productSchema(product),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            ...(primaryCollection
              ? [{ name: primaryCollection.title, url: `/collections/${primaryCollection.handle}` }]
              : []),
            { name: product.title, url: `/products/${product.handle}` },
          ]),
        ]}
      />
      <RecentlyViewedRecorder handle={product.handle} />
      <ProductMetaPixel pixelId={product.metafields["custom.meta_pixel_id"] ?? null} />

      <PurchaseProvider product={product}>
        <AnnouncementBar messages={shopPdp.announcements} />

        <div className="container-page">
          <div className="hidden py-4 sm:block">
            <Breadcrumb items={crumbs} />
          </div>

          <section
            id="purchase"
            aria-label={`Buy ${product.title}`}
            className="scroll-mt-24 pb-14 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:pb-20 xl:gap-x-16"
          >
            {/* Desktop: a viewport-tall sticky box (below the fixed header)
                that centres the gallery vertically while the panel scrolls. */}
            <div className="-mx-4 self-start sm:-mx-6 lg:sticky lg:top-18 lg:col-span-5 lg:mx-0 lg:flex lg:h-[calc(100svh-4.5rem)] lg:items-center">
              <div className="w-full">
                <ProductGallery />
              </div>
            </div>
            <div className="pt-7 lg:col-span-7 lg:pt-2 xl:pr-8">
              <PurchasePanel
                subtitle={subtitle}
                perks={perks}
                rating={rating}
                reassurance={reassurance}
                delivery={shipping.deliveryEstimate}
              />
            </div>
          </section>
        </div>

        {/* Why this one → proof it works → how to use it → what people say. */}
        <ProductBenefits items={pdp.benefits} />
        <ComparisonTable product={product} />
        <ProductFeatures items={product.featureHighlights} />
        <ProductDemo video={pdp.demoVideo} title={product.title} />
        <HowItWorks steps={pdp.howItWorks} />
        <ProblemSolution story={pdp.story} />
        <UseCases items={pdp.useCases} />

        <div className="container-page">
          <Suspense fallback={null}>
            <div className="pb-20 empty:hidden lg:pb-28">
              <Reviews product={product} />
            </div>
          </Suspense>
        </div>

        <ProductDetails included={pdp.whatsIncluded} specs={product.specs} shipping={shipping} />
        <ReturnsGuarantee points={trustPoints} />
        <ProductFAQ items={pdp.faq} supportEmail={contact.email} />
        <FinalCTA
          headline={ctaHeadline}
          subtitle={subtitle}
          assurances={[...trustPoints.map((point) => point.label), ...(shipping.costNote ? [`Shipping ${shipping.costNote.split(" — ")[0]!.toLowerCase()}`] : [])]}
        />

        <StickyAddToCart />
      </PurchaseProvider>
    </>
  );
}
