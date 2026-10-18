import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { productRepository, redirectRepository } from "@/lib/catalog";
import { shopRepository } from "@/lib/catalog/shop";
import { relatedProducts } from "@/lib/catalog/recommendations";
import { getPaymentMethods } from "@/lib/shopify/payments";
import { productRating } from "@/lib/catalog/selectors";
import { productMetadata } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbSchema, faqSchema, productSchema } from "@/lib/seo/jsonld";
import { blogRepository } from "@/lib/catalog/blog";
import { articleTeaser, relatedArticles } from "@/lib/catalog/related-articles";
import { pdpFontVariables } from "@/lib/pdp/fonts";
import { isFreeShipping } from "@/lib/pdp/shipping";
import { cn } from "@/lib/utils/cn";

// Reviews section is switched off for now — re-enable together with the <Reviews> block below.
// import { Reviews } from "@/components/product/reviews";
import { reviewProvider } from "@/components/product/reviews";
import { ComparisonTable } from "@/components/product/comparison-table";
import { ProductGrid } from "@/components/product/product-card";
import { SectionHeading } from "@/components/pdp/section-heading";
import { RecentlyViewedRecorder } from "@/hooks/use-recently-viewed";
import { PurchaseProvider } from "@/components/pdp/purchase-context";
import { ProductGallery } from "@/components/pdp/product-gallery";
import { PurchasePanel } from "@/components/pdp/purchase-panel";
// import { PurchaseFeedback } from "@/components/pdp/purchase-feedback"; // switched off, see below
import { ProductAccordion } from "@/components/pdp/product-accordion";
import { SaleCountdown } from "@/components/pdp/sale-countdown";
import { AnchorScroll } from "@/components/pdp/anchor-scroll";
import { Icon, type IconName } from "@/components/pdp/icon";
import { PdpIcon } from "@/components/pdp/pdp-icon";
import { Stars } from "@/components/pdp/stars";
import {
  HowItWorks,
  ProblemSolution,
  ProductBenefits,
  ProductFeatures,
  ProductVideos,
  UseCases,
} from "@/components/pdp/story-sections";
import { ProductDetails, ProductFAQ, TrustPoints } from "@/components/pdp/detail-sections";
import { StickyAddToCart } from "@/components/pdp/sticky-add-to-cart";
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
 * The layout: a sticky gallery beside the buy
 * box (trust chips → rating → title → perks → options → button → accordion →
 * reassurance → customer quotes), then full-width bands that alternate with
 * rounded tinted panels, ending in reviews and the FAQ.
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

/**
 * Keyword → icon for the perk list, checked in order against each perk's text
 * (case-insensitive) — first match wins. Perks come from the Shopify sync, so
 * this can't be a fixed per-index mapping; a perk that matches nothing falls
 * back to the plain checkmark.
 */
const PERK_ICON_RULES: [pattern: RegExp, icon: IconName][] = [
  [/track|locat|find|gps|bluetooth|ping/i, "map-pin"],
  [/water|splash|rain|sweat/i, "droplet"],
  [/slim|thin|light|compact|pocket|feather/i, "feather"],
  [/secur|protect|block|anti|lock|safe|rfid|theft/i, "shield"],
  [/battery|charge|last|hours|days|durable|long/i, "clock"],
  [/travel|carry|portable|world|global|everywhere/i, "globe"],
  [/gift|bundle|kit|set\b|bonus/i, "gift"],
  [/premium|quality|aluminum|metal|leather|steel|carbon/i, "star"],
  [/easy|simple|quick|fast|instant|one[- ]touch|pop/i, "sparkles"],
  [/men and women|everyone|unisex|family|all ages/i, "users"],
  [/fit|size|card|wallet|slot|hold/i, "layers"],
];

function perkIcon(perk: string): IconName {
  return PERK_ICON_RULES.find(([pattern]) => pattern.test(perk))?.[1] ?? "check";
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

  const [shopPdp, contact, liveReviews, payments] = await Promise.all([
    shopRepository.getPdpContent(),
    shopRepository.getContact(),
    // Same cached Judge.me request the reviews section makes, so the count shown
    // here matches it (the synced metafield lags).
    reviewProvider?.list(product.handle).catch(() => null) ?? null,
    getPaymentMethods(),
  ]);
  const rating =
    liveReviews && liveReviews.total > 0
      ? { value: liveReviews.average, count: liveReviews.total }
      : productRating(product);

  // The "What customers say" carousel is switched off for now. To bring it back,
  // restore its import (PurchaseFeedback, commented out above) and:
  //
  //   const feedbackReviews = (liveReviews?.reviews ?? []).filter((r) => r.rating === 5).slice(0, 5);
  //
  // then uncomment the JSX block marked "switched off" further down.
  const related = relatedProducts(product, await productRepository.getAllProducts(), 4);
  const articles = relatedArticles(product, await blogRepository.getAllArticles(), 3);

  const { pdp } = product;
  const subtitle = product.metafields["custom.subtitle"] ?? null;
  // Short benefit lines directly under the title — a plain JSON array of
  // strings (custom.perks). A malformed/missing metafield yields no perks.
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

  // The store's own guarantees. custom.trust_point_override lets one product
  // swap out a single store-wide trust point for its own (e.g. this product
  // doesn't accept returns, so its "returns" entry is replaced rather than just
  // dropped) — JSON {"replaces": "<icon key>", "icon", "label", "body"}. A
  // malformed/missing metafield leaves the store's trust points untouched.
  const trustPoints = (() => {
    const raw = product.metafields["custom.trust_point_override"];
    if (!raw) return shopPdp.trustPoints;
    try {
      const override = JSON.parse(raw) as { replaces: string; icon: string; label: string; body: string };
      if (!override.replaces || !override.label || !override.body) return shopPdp.trustPoints;
      return shopPdp.trustPoints.map((point) =>
        point.icon === override.replaces
          ? { icon: override.icon ?? point.icon, label: override.label, body: override.body }
          : point,
      );
    } catch {
      return shopPdp.trustPoints;
    }
  })();
  // A product's own delivery estimate (custom.delivery_estimate) beats the
  // store-wide one — both the buy box and the specs section read this.
  const shipping = {
    ...shopPdp.shipping,
    deliveryEstimate: product.metafields["custom.delivery_estimate"]?.trim() || shopPdp.shipping.deliveryEstimate,
  };
  // The "free delivery unlocked" strip is only honest when the store really
  // says shipping is free; "calculated at checkout" must not trigger it.
  const freeShipping = isFreeShipping(shipping.costNote);
  const saleEndsAt = product.metafields["custom.sale_ends_at"] ?? null;

  const chips = trustPoints.slice(0, 4);
  const securePoint = trustPoints.find((p) => p.icon === "lock");
  const deliveryPoint = trustPoints.find((p) => p.icon === "truck");

  const primaryCollection = product.collections[0];
  const crumbs = [
    { name: "Home", url: "/" },
    ...(primaryCollection
      ? [{ name: primaryCollection.title, url: `/collections/${primaryCollection.handle}` }]
      : []),
    { name: product.title, url: `/products/${product.handle}` },
  ];

  // Real footage only: the demo video and customer clips (custom.ugc_media).
  const videos = [
    ...(pdp.demoVideo ? [{ ...pdp.demoVideo, altText: `${product.title} demo` }] : []),
    ...pdp.ugcMedia.filter((m) => m.type === "video"),
  ];

  const accordion: { title: string; body: React.ReactNode }[] = [];
  if (pdp.howItWorks.length > 0) {
    accordion.push({
      title: "How it works",
      body: (
        <ol className="flex flex-col gap-2">
          {pdp.howItWorks.map((step) => (
            <li key={step.label}>
              <strong className="font-medium text-ink">{step.label}.</strong> {step.body}
            </li>
          ))}
        </ol>
      ),
    });
  }
  if (pdp.whatsIncluded.length > 0) {
    accordion.push({
      title: "What's in the box",
      body: (
        <ul className="flex flex-col gap-1.5">
          {pdp.whatsIncluded.map((item) => (
            <li key={item.label}>
              <strong className="font-medium text-ink">{item.label}:</strong> {item.body}
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (shipping.deliveryEstimate || shipping.costNote) {
    accordion.push({
      title: "Shipping",
      body: (
        <div className="flex flex-col gap-2">
          {shipping.deliveryEstimate && <p>Delivery in {shipping.deliveryEstimate}.</p>}
          {shipping.costNote && <p>{shipping.costNote}.</p>}
        </div>
      ),
    });
  }

  return (
    <div className={cn("pdp-theme", pdpFontVariables)}>
      <AnchorScroll />
      <JsonLd
        data={[
          productSchema(product),
          breadcrumbSchema(crumbs),
          ...(pdp.faq.length > 0
            ? [faqSchema(pdp.faq.map((item) => ({ question: item.question, answer: item.answer })))]
            : []),
        ]}
      />
      <RecentlyViewedRecorder handle={product.handle} />
      <ProductMetaPixel pixelId={product.metafields["custom.meta_pixel_id"] ?? null} />

      <PurchaseProvider product={product}>
        {/* ── Offer countdown: a real, merchant-set deadline, shown first ── */}
        <SaleCountdown endsAt={saleEndsAt} />

        {/* ── Above the fold ─────────────────────────────────────────────── */}
        <div className="container-page pt-6 pb-10 md:pt-8 lg:pb-14">
          <section
            id="purchase"
            aria-label={`Buy ${product.title}`}
            className="grid scroll-mt-24 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16"
          >
            <ProductGallery />

            <div className="min-w-0 lg:pt-4">
              {chips.length > 0 && (
                <ul className="mb-4 flex flex-wrap gap-2 font-ui sm:gap-1.5">
                  {chips.map((point) => (
                    <li
                      key={point.label}
                      className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-sage-100 px-3 py-1.5 text-[0.78rem] leading-none font-medium text-sage-800 sm:px-2.5 sm:text-[0.72rem]"
                    >
                      <PdpIcon icon={point.icon} size={16} className="shrink-0" />
                      <span>{point.label}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Stars and review count — plain text, not a link. */}
              {rating && rating.count > 0 && (
                <p
                  className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-ui text-body-sm"
                  aria-label={`Rated ${rating.value.toFixed(1)} out of 5 from ${rating.count.toLocaleString("en-US")} reviews`}
                >
                  <Stars value={rating.value} />
                  <span className="font-numeral font-semibold tabular-nums">{rating.value.toFixed(1)}</span>
                  <span className="text-ink-soft">
                    {rating.count.toLocaleString("en-US")} review{rating.count === 1 ? "" : "s"}
                  </span>
                </p>
              )}

              <h1
                className={cn(
                  "mt-3 font-serif leading-[1.15] font-medium text-wrap",
                  // Dropshipped titles often run 150+ characters of search keywords;
                  // at display size they'd fill the fold, so long ones step down.
                  product.title.length > 90
                    ? "text-[1.125rem]"
                    : "text-[length:clamp(1.375rem,1.25rem+0.5vw,1.625rem)]",
                )}
              >
                {product.title}
              </h1>
              {subtitle && <p className="mt-2 text-body text-ink-soft">{subtitle}</p>}

              {perks.length > 0 && (
                <ul className="mt-5 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  {perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-body-sm">
                      {/* items-start, not items-center: an icon centred on the
                          whole row drifts down whenever a perk wraps to two
                          lines. It belongs on the first line. */}
                      <span
                        aria-hidden="true"
                        className="mt-px grid size-5.5 shrink-0 place-items-center rounded-full bg-sage-600 text-ivory"
                      >
                        <Icon name={perkIcon(perk)} className="size-3" />
                      </span>
                      {perk}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-8">
                <PurchasePanel
                  saleEndsAt={saleEndsAt}
                  freeShipping={freeShipping}
                  delivery={shipping.deliveryEstimate}
                  payments={payments}
                />
              </div>

              <ProductAccordion items={accordion} />

              {(deliveryPoint || securePoint) && (
                <ul className="mt-6 space-y-3.5 rounded-card bg-cream/80 p-5 text-body-sm md:p-6">
                  {deliveryPoint && (
                    <li className="flex gap-3">
                      <Icon name="truck" className="size-5 shrink-0" />
                      <span>
                        {shipping.deliveryEstimate
                          ? `${deliveryPoint.label} in ${shipping.deliveryEstimate}.`
                          : `${deliveryPoint.label} on every order.`}{" "}
                        <Link href="/pages/shipping" className="link-underline">
                          Shipping details
                        </Link>
                      </span>
                    </li>
                  )}
                  {securePoint && (
                    <li className="flex gap-3">
                      <Icon name="shield" className="size-5 shrink-0" />
                      <span>{securePoint.label} by Shopify.</span>
                    </li>
                  )}
                </ul>
              )}

              {/* "What customers say" carousel: switched off for now.
                            {feedbackReviews.length > 0 && (
                <PurchaseFeedback reviews={feedbackReviews} className="mt-5" />
              )}
              */}
            </div>
          </section>
        </div>

        {/* Show it working → what's different → how to use → why → fit → proof. */}
        <ProductVideos videos={videos} title={product.title} />
        <ProductFeatures items={product.featureHighlights} />
        <HowItWorks steps={pdp.howItWorks} />
        <ProductBenefits items={pdp.benefits} />
        <ProblemSolution story={pdp.story} />
        <UseCases items={pdp.useCases} />
        <TrustPoints points={trustPoints} />
        <ComparisonTable product={product} />
        <ProductDetails included={pdp.whatsIncluded} specs={product.specs} />

        {/* Reviews section: switched off for now. To bring it back, restore the
            Suspense import and the Reviews import above, then uncomment:
        <Suspense fallback={null}>
          <Reviews product={product} />
        </Suspense>
        */}

        <ProductFAQ items={pdp.faq} supportEmail={contact.email} />

        {articles.length > 0 && (
          <section className="py-12 lg:py-16" aria-labelledby="learn">
            <div className="container-page">
              <SectionHeading eyebrow="From the journal" title="Good to know." id="learn" />
              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {articles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/blogs/${article.blogHandle}/${article.handle}`}
                      className="group block h-full rounded-media bg-porcelain p-6 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:shadow-float lg:p-7"
                    >
                      {article.tags[0] && <p className="eyebrow">{article.tags[0]}</p>}
                      <h3 className="mt-5 font-serif text-heading-3">{article.title}</h3>
                      <p className="mt-2 text-body-sm text-ink-soft">{articleTeaser(article)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="py-12 lg:py-16" aria-labelledby="related">
            <div className="container-page">
              <SectionHeading
                eyebrow="Complete your carry"
                title="You may also like."
                id="related"
              />
              <ProductGrid
                products={related}
                listName="pdp_related"
                priorityCount={0}
                className="mt-8 gap-y-8 xl:grid-cols-4"
              />
            </div>
          </section>
        )}

        <StickyAddToCart />
      </PurchaseProvider>
    </div>
  );
}
