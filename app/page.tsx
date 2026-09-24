import { productRepository } from "@/lib/catalog";
import { shopRepository } from "@/lib/catalog/shop";
import { newArrivals } from "@/lib/catalog/recommendations";
import { getCategoryCollections } from "@/lib/navigation";
import { getStoreReviewHighlights, type StoreReview } from "@/services/reviews/judgeme";

import { EmptyState } from "@/components/ui/primitives";
import { RecentlyViewedSection } from "@/components/product/recently-viewed-section";
import { Hero } from "@/components/home/hero";
import {
  BrandStory,
  BrandValueSection,
  CategoryGrid,
  FeaturedProducts,
  FeaturedProductSpotlight,
  FinalCTA,
  HomepageFAQ,
  LifestyleStory,
  Testimonials,
  TrustBar,
  WhyChooseUs,
} from "@/components/home/home-sections";
import { GridIcon } from "@/components/ui/icons";

/**
 * Homepage.
 *
 * The hero is untouched; everything below it follows one narrative —
 * reassurance → what to buy → why these products → where to look → how it
 * feels → what customers say → one product up close → why this shop → who we
 * are → remaining questions → shop.
 *
 * Content comes from Shopify (catalog, shop metafields `custom.home_*`) and
 * Judge.me. Each section disappears when its data is missing, so nothing here
 * is placeholder copy or invented social proof.
 */

export const revalidate = 1800;

export default async function HomePage() {
  const [products, collections, home, pdp, categories, reviewData] = await Promise.all([
    productRepository.getAllProducts(),
    productRepository.getAllCollections(),
    shopRepository.getHomeContent(),
    shopRepository.getPdpContent(),
    getCategoryCollections(),
    getStoreReviewHighlights().catch(() => null),
  ]);

  if (products.length === 0) return <EmptyCatalogState />;

  // Hero input — unchanged from the original homepage.
  const arrivals = newArrivals(products, 9);

  const byId = new Map(products.map((product) => [product.id, product]));
  const featuredCollection = collections.find((c) => c.id === home.featuredCollectionId) ?? null;
  const featuredProducts = (featuredCollection?.productIds ?? [])
    .map((id) => byId.get(id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product?.publishedOnline))
    .slice(0, 8);
  const spotlight = (home.spotlightProductId && byId.get(home.spotlightProductId)) || null;
  const rating = reviewData ? { average: reviewData.average, total: reviewData.total } : null;

  return (
    <>
      <Hero fallbackProducts={arrivals} />

      <TrustBar points={pdp.trustPoints} rating={rating} />
      <FeaturedProducts collection={featuredCollection} products={featuredProducts} />
      <BrandValueSection blocks={home.intro} />
      <CategoryGrid categories={categories} products={products} />
      <LifestyleStory block={home.lifestyle[0]} />
      <Testimonials rating={rating} reviews={pickReviews(reviewData?.reviews ?? [])} products={products} />
      <FeaturedProductSpotlight product={spotlight} />
      <WhyChooseUs items={home.differentiators} />
      <BrandStory block={home.story[0]} />
      <HomepageFAQ items={home.faq} />
      <FinalCTA
        productCount={products.filter((p) => p.publishedOnline).length}
        categories={categories.map((c) => c.title)}
      />

      <div className="container-page pb-8">
        <RecentlyViewedSection />
      </div>
    </>
  );
}

/**
 * Six reviews for the homepage: merchant-highlighted first, then ones with a
 * photo and enough words to say something, at most two per product so one
 * best seller doesn't fill the section. Selection only — text is never edited.
 */
function pickReviews(reviews: StoreReview[], limit = 6): StoreReview[] {
  const eligible = reviews.filter(
    (r) => r.rating >= 4 && r.body.length >= 60 && !isRepetitive(r.body) && !mentionsMarketplace(r.body),
  );
  const ranked = [...eligible].sort(
    (a, b) =>
      Number(b.highlighted) - Number(a.highlighted) ||
      // A real name reads as a real person — prefer it over "Anonymous".
      Number(isNamed(b)) - Number(isNamed(a)) ||
      Number(b.attachments.length > 0) - Number(a.attachments.length > 0) ||
      b.body.length - a.body.length,
  );
  const perProduct = new Map<number | null, number>();
  const out: StoreReview[] = [];
  for (const review of ranked) {
    const count = perProduct.get(review.productExternalId) ?? 0;
    if (count >= 2) continue;
    perProduct.set(review.productExternalId, count + 1);
    out.push(review);
    if (out.length === limit) break;
  }
  return out;
}

/**
 * Reviews imported from the supplier's marketplace sometimes talk about that
 * purchase, not the product — its price ("$5 using coins"), its seller, its
 * shipping, or the supplier's own brand (Hoco). Accurate there, confusing
 * here, so they aren't picked for the
 * homepage (they stay on the product page with every other review).
 */
function mentionsMarketplace(text: string): boolean {
  return /[$€£]\s?\d|\b\d+\s?(usd|dollars?)\b|\bcoins?\b|aliexpress|\bhoco\b|\bseller\b|\bstore\b|\bdispute\b|\bcoupon\b/i.test(text);
}

function isNamed(review: StoreReview): boolean {
  return !/^(anonymous|customer|verified customer)$/i.test(review.author.trim());
}

/** "Super super super…" padding: fewer than half the words are distinct. */
function isRepetitive(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  return words.length >= 8 && new Set(words).size / words.length < 0.5;
}

/**
 * Shown before the first sync. Actionable rather than decorative — the
 * storefront is working, it simply has no catalog yet.
 *
 * The setup instructions name the commerce platform, so they are development
 * only; a shopper who ever lands here sees a neutral message instead.
 */
function EmptyCatalogState() {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="container-page">
      <EmptyState
        icon={<GridIcon size={24} />}
        title={isDev ? "No products synced yet" : "Nothing to show just yet"}
        description={
          isDev
            ? "Connect your Shopify store and run the catalog sync to populate this storefront."
            : "We are updating our collection. Please check back shortly."
        }
        action={
          isDev ? (
            <div className="space-y-3 text-left">
              <p className="text-sm text-ink-muted">
                Run this from the project root:
              </p>
              <pre className="overflow-x-auto rounded-md bg-surface-sunken px-4 py-3 text-sm">
                <code>npm run shopify:sync</code>
              </pre>
              <p className="text-xs text-ink-subtle">
                Fill in <code>.env.local</code> from <code>.env.example</code>{" "}
                first.
              </p>
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
