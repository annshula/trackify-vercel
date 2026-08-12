import Image from "next/image";
import Link from "next/link";

import { productRepository } from "@/lib/catalog";
import {
  bestSellersProxy,
  newArrivals,
  onSaleProducts,
} from "@/lib/catalog/recommendations";
import { primaryImage, imageAlt } from "@/lib/utils/image";

import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-card";
import { SectionHeading, EmptyState, Badge } from "@/components/ui/primitives";
import { Accordion } from "@/components/ui/accordion";
import { RecentlyViewedSection } from "@/components/product/recently-viewed-section";
import { Hero } from "@/components/home/hero";
import { Testimonials } from "@/components/home/testimonials";
import {
  ChevronRightIcon,
  GridIcon,
  RefreshIcon,
  ShieldIcon,
  TruckIcon,
} from "@/components/ui/icons";

/**
 * Homepage.
 *
 * A single narrative — hero, new collection, most-recommended, reassurance,
 * best sellers, word of mouth, FAQ, one more push — rather than a wall of
 * interchangeable cards. Every section is built from real catalog data and
 * disappears when there is nothing genuine to show, so this layout works for
 * any catalog, not just the products it happened to be built against.
 */

export const revalidate = 1800;

export default async function HomePage() {
  const [products, collections] = await Promise.all([
    productRepository.getAllProducts(),
    productRepository.getAllCollections(),
  ]);

  if (products.length === 0) return <EmptyCatalogState />;

  const featuredCollections = collections
    .filter((collection) => collection.productIds.length > 0)
    .sort((a, b) => b.productIds.length - a.productIds.length)
    .slice(0, 3);

  // The hero is the latest published product — a freshly added or restocked
  // item should be the first thing a returning visitor sees.
  const arrivals = newArrivals(products, 9);
  const heroProduct = arrivals[0] ?? products[0]!;
  // Excludes the hero so it is not repeated as the first card in this grid.
  const arrivalsBelowHero = arrivals.slice(1, 7);
  const bestSellers = bestSellersProxy(products, 8);
  const sale = onSaleProducts(products, 4);
  // A best seller distinct from the hero, so the banner never repeats the
  // exact product the hero already led with.
  const spotlight =
    bestSellers.find((product) => product.id !== heroProduct.id) ??
    bestSellers[0] ??
    heroProduct;
  const spotlightImage = primaryImage(spotlight);

  return (
    <>
      <Hero heroProduct={heroProduct} fallbackProducts={arrivals} />

      {/* ── New collection ───────────────────────────────────────────── */}
      {arrivalsBelowHero.length > 0 && (
        <section
          id="new-collection"
          className="container-page scroll-mt-24 py-16"
          aria-labelledby="new-heading"
        >
          <SectionHeading
            eyebrow="Just landed"
            title="Our new collection"
            description="Freshly added pieces, chosen the same way as everything else here: to earn their place."
            align="center"
            className="scroll-reveal mb-10"
          />
          <h2 id="new-heading" className="sr-only">
            New collection
          </h2>
          <ProductGrid
            products={arrivalsBelowHero}
            listName="New collection"
            priorityCount={3}
            className="sm:grid-cols-3 xl:grid-cols-4"
          />
          <div className="mt-10 flex justify-center">
            <ButtonLink
              href="/collections?sort=newest"
              variant="outline"
              size="lg"
              className="rounded-full"
            >
              See more collection
            </ButtonLink>
          </div>
        </section>
      )}

      {/* ── Most recommended (bento) ─────────────────────────────────── */}
      {featuredCollections.length > 0 && (
        <section
          className="container-page py-16"
          aria-labelledby="recommended-heading"
        >
          <SectionHeading
            eyebrow="Browse"
            title="Most recommended for you"
            description="Discover top-recommended gear, tailored to how you carry — every piece here belongs to a real collection you can browse in full."
            align="center"
            className="scroll-reveal mb-10"
          />
          <h2 id="recommended-heading" className="sr-only">
            Most recommended collections
          </h2>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-[16rem_16rem] sm:gap-5 lg:grid-rows-[19rem_19rem]">
            {featuredCollections.map((collection, index) => {
              const image =
                collection.image ??
                primaryImage(
                  products.find((product) =>
                    product.collections.some((c) => c.id === collection.id),
                  ) ?? products[0]!,
                );

              return (
                <li
                  key={collection.id}
                  className={
                    index === 0
                      ? "relative aspect-4/5 sm:row-span-2 sm:aspect-auto"
                      : "relative aspect-4/5 sm:aspect-auto"
                  }
                >
                  <Link
                    href={`/collections/${collection.handle}`}
                    className="group relative block size-full overflow-hidden rounded-xl bg-surface-sunken"
                  >
                    {image && (
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 40vw, (min-width: 640px) 45vw, 100vw"
                        loading="eager"
                        className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-105"
                      />
                    )}
                    <span
                      className="absolute inset-0 bg-linear-to-t from-black/70 via-black/15 to-transparent"
                      aria-hidden="true"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                      <span>
                        <span className="block font-display text-xl text-white">
                          {collection.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-white/75">
                          {collection.productIds.length} piece
                          {collection.productIds.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-ink transition-transform duration-300 group-hover:translate-x-0.5">
                        View all
                        <ChevronRightIcon size={14} />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── What we can offer ────────────────────────────────────────── */}
      <section
        className="container-page py-16"
        aria-labelledby="promise-heading"
      >
        <SectionHeading
          title="What we can offer you"
          align="center"
          className="scroll-reveal mb-10"
        />
        <h2 id="promise-heading" className="sr-only">
          Our promise
        </h2>
        <ul className="grid gap-5 sm:grid-cols-3">
          {[
            {
              icon: TruckIcon,
              title: "Tracked, always",
              body: "Follow every order from dispatch to delivery inside your account.",
            },
            {
              icon: RefreshIcon,
              title: "Returns without friction",
              body: "Change your mind? Start a return straight from your order history.",
            },
            {
              icon: ShieldIcon,
              title: "Checkout you can trust",
              body: "Payments handled entirely by our secure payment provider. Your card details never touch us.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="scroll-reveal flex flex-col items-center gap-3 rounded-xl border border-line bg-surface p-8 text-center"
              >
                <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon size={24} />
                </span>
                <h3 className="font-sans text-base font-medium tracking-normal">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Best sellers ─────────────────────────────────────────────── */}
      {bestSellers.length > 0 && (
        <section
          className="container-page py-16"
          aria-labelledby="best-heading"
        >
          <SectionHeading
            eyebrow="Popular"
            title="Reaching for again and again"
            action={{
              href: "/collections?sort=best-selling",
              label: "See all",
            }}
            className="scroll-reveal mb-8"
          />
          <h2 id="best-heading" className="sr-only">
            Popular products
          </h2>
          <ProductGrid
            products={bestSellers}
            listName="Best sellers"
            priorityCount={0}
          />
        </section>
      )}

      {/* ── Sale ─────────────────────────────────────────────────────── */}
      {sale.length > 0 && (
        <section
          className="container-page py-16"
          aria-labelledby="sale-heading"
        >
          <div className="scroll-reveal mb-8 flex items-center gap-3">
            <Badge tone="danger">Reduced</Badge>
            <SectionHeading title="Last chance" className="flex-1" />
          </div>
          <h2 id="sale-heading" className="sr-only">
            Reduced products
          </h2>
          <ProductGrid products={sale} listName="Sale" priorityCount={0} />
        </section>
      )}

      <Testimonials />

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="container-page py-16" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            title="You've got questions & we've got answers"
            align="center"
            className="scroll-reveal mb-8"
          />
          <h2 id="faq-heading" className="sr-only">
            Frequently asked questions
          </h2>
          <Accordion
            items={[
              {
                id: "delivery",
                title: "How long does delivery take?",
                content:
                  "Delivery options and estimated dates are calculated at checkout from your address. You will see the exact cost and timeframe before paying, and tracking appears in your account once the order ships.",
              },
              {
                id: "returns",
                title: "What is the returns policy?",
                content: (
                  <>
                    Start a return from your order history. See the{" "}
                    <Link
                      href="/pages/returns"
                      className="text-ink underline underline-offset-4"
                    >
                      full returns policy
                    </Link>{" "}
                    for timeframes and conditions.
                  </>
                ),
              },
              {
                id: "payment",
                title: "Is checkout secure?",
                content:
                  "Yes. Checkout and payment are handled entirely by our PCI-compliant payment provider on their own secure infrastructure. This site never sees, stores, or processes your card details.",
              },
              {
                id: "account",
                title: "Do I need an account to order?",
                content:
                  "No — you can check out as a guest. Creating an account lets you see order history, track deliveries, and save addresses for next time.",
              },
            ]}
          />
        </div>
      </section>

      {/* ── Closing banner ───────────────────────────────────────────── */}
      <section className="container-page pb-16">
        <div className="scroll-reveal relative overflow-hidden rounded-2xl bg-primary">
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div className="relative order-2 flex flex-col items-start gap-5 px-6 py-14 sm:px-10 sm:py-16 lg:order-1 lg:px-14">
              <h2 className="text-3xl text-on-primary sm:text-4xl">
                Build your everyday carry with gear you can trust.
              </h2>
              <p className="max-w-md text-base leading-relaxed text-on-primary/75">
                One tight edit, tracked from checkout to doorstep. Start with{" "}
                {spotlight.title}, or browse the full collection.
              </p>
              <ButtonLink
                href="/collections"
                size="lg"
                className="rounded-full bg-accent text-on-accent hover:bg-accent-hover"
              >
                Shop now
              </ButtonLink>
            </div>

            <div className="relative order-1 aspect-4/3 lg:order-2 lg:aspect-auto lg:min-h-100">
              {spotlightImage ? (
                <Image
                  src={spotlightImage.url}
                  alt={imageAlt(spotlightImage, spotlight.title)}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="size-full bg-surface-sunken" />
              )}
              <span
                className="absolute inset-0 bg-linear-to-r from-primary/40 to-transparent lg:from-primary/20"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container-page pb-8">
        <RecentlyViewedSection />
      </div>
    </>
  );
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
