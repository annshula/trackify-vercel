import Image from "next/image";
import Link from "next/link";

import { productRepository } from "@/lib/catalog";
import {
  bestSellersProxy,
  newArrivals,
  onSaleProducts,
} from "@/lib/catalog/recommendations";
import { primaryImage, imageAlt } from "@/lib/utils/image";
import { defaultVariant } from "@/lib/catalog/selectors";

import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/product/product-card";
import {
  SectionHeading,
  EmptyState,
  Price,
  Badge,
} from "@/components/ui/primitives";
import { Accordion } from "@/components/ui/accordion";
import { RecentlyViewedSection } from "@/components/product/recently-viewed-section";
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
 * A single narrative — hero, the edit, what's new, one spotlight, reassurance,
 * FAQ — rather than a wall of interchangeable cards. Every section is built
 * from real catalog data and disappears when there is nothing genuine to show.
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
  const arrivalsBelowHero = arrivals.slice(1, 9);
  const heroImage = primaryImage(heroProduct);
  const bestSellers = bestSellersProxy(products, 8);
  const sale = onSaleProducts(products, 4);
  // A best seller distinct from the hero, so the two feature sections never
  // show the same product twice.
  const spotlight = bestSellers.find((product) => product.id !== heroProduct.id) ?? bestSellers[0] ?? heroProduct;
  const spotlightImage = primaryImage(spotlight);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="container-page pt-4 pb-14 sm:pt-6">
        <div className="relative overflow-hidden rounded-xl bg-surface-sunken">
          <div className="grid lg:grid-cols-2">
            <div className="order-2 flex flex-col justify-center gap-6 px-6 py-12 sm:px-10 sm:py-16 lg:order-1 lg:px-14 lg:py-20">
              <p className="text-2xs font-semibold tracking-[0.2em] text-accent uppercase">
                {heroProduct.productType || "The new edit"}
              </p>
              <h1 className="text-4xl sm:text-5xl">
                Considered pieces,
                <br />
                made to last.
              </h1>
              <p className="max-w-md text-base leading-relaxed text-ink-muted">
                A tight edit rather than an endless catalogue. Every piece is
                chosen to earn its place, and every order is tracked from
                checkout to doorstep.
              </p>
              {/* The product title lives here rather than inside a CTA below —
                  a long Shopify title inside a nowrap button breaks layout on
                  narrow screens, while a truncating text line degrades
                  gracefully at any width. */}
              <p className="line-clamp-1 text-sm text-ink-subtle">
                Featuring <span className="font-medium text-ink">{heroProduct.title}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/collections" size="lg">
                  Shop the edit
                </ButtonLink>
                <ButtonLink href={`/products/${heroProduct.handle}`} variant="outline" size="lg">
                  View product
                </ButtonLink>
              </div>
            </div>

            <div className="relative order-1 aspect-4/3 lg:order-2 lg:aspect-auto lg:min-h-135">
              {heroImage ? (
                <Image
                  src={heroImage.url}
                  alt={imageAlt(heroImage, heroProduct.title)}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority
                  className="object-cover"
                />
              ) : (
                <div className="size-full bg-line" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Collections ──────────────────────────────────────────────── */}
      {featuredCollections.length > 0 && (
        <section
          className="container-page py-14"
          aria-labelledby="collections-heading"
        >
          <SectionHeading
            eyebrow="Browse"
            title="Shop by collection"
            action={{ href: "/collections", label: "All collections" }}
            className="mb-8"
          />
          <h2 id="collections-heading" className="sr-only">
            Collections
          </h2>

          <ul className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {featuredCollections.map((collection) => {
              const image =
                collection.image ??
                primaryImage(
                  products.find((product) =>
                    product.collections.some((c) => c.id === collection.id),
                  ) ?? products[0]!,
                );

              return (
                <li key={collection.id}>
                  <Link
                    href={`/collections/${collection.handle}`}
                    className="group relative block overflow-hidden rounded-lg bg-surface-sunken"
                  >
                    <span className="relative block aspect-3/4 sm:aspect-4/5">
                      {image && (
                        <Image
                          src={image.url}
                          alt=""
                          fill
                          sizes="(min-width: 640px) 33vw, 100vw"
                          loading="eager"
                          className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-105"
                        />
                      )}
                      <span
                        className="absolute inset-0 bg-linear-to-t from-black/65 via-black/10 to-transparent"
                        aria-hidden="true"
                      />
                    </span>
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
                      <ChevronRightIcon
                        size={20}
                        className="shrink-0 text-white transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── New arrivals ─────────────────────────────────────────────── */}
      {arrivalsBelowHero.length > 0 && (
        <section className="container-page py-14" aria-labelledby="new-heading">
          <SectionHeading
            eyebrow="Just landed"
            title="New arrivals"
            action={{ href: "/collections?sort=newest", label: "See all" }}
            className="mb-8"
          />
          <h2 id="new-heading" className="sr-only">
            New arrivals
          </h2>
          <ProductGrid
            products={arrivalsBelowHero}
            listName="New arrivals"
            priorityCount={2}
          />
        </section>
      )}

      {/* ── Spotlight ────────────────────────────────────────────────── */}
      <section
        className="container-page py-14"
        aria-labelledby="spotlight-heading"
      >
        <div className="grid items-center gap-8 rounded-xl bg-surface p-6 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-sunken">
            {spotlightImage && (
              <Image
                src={spotlightImage.url}
                alt={imageAlt(spotlightImage, spotlight.title)}
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            )}
          </div>

          <div className="flex flex-col gap-5">
            <p className="text-2xs font-semibold tracking-[0.2em] text-accent uppercase">
              In focus
            </p>
            <h2 id="spotlight-heading" className="text-3xl">
              {spotlight.title}
            </h2>
            {spotlight.description && (
              <p className="line-clamp-4 text-base leading-relaxed text-ink-muted">
                {spotlight.description}
              </p>
            )}
            <Price
              amount={spotlight.priceRange.min}
              compareAt={defaultVariant(spotlight)?.compareAtPrice ?? null}
              currencyCode={spotlight.priceRange.currencyCode}
              size="lg"
            />
            <div>
              <ButtonLink href={`/products/${spotlight.handle}`} size="lg">
                View product
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── Best sellers ─────────────────────────────────────────────── */}
      {bestSellers.length > 0 && (
        <section
          className="container-page py-14"
          aria-labelledby="best-heading"
        >
          <SectionHeading
            eyebrow="Popular"
            title="Reaching for again and again"
            action={{
              href: "/collections?sort=best-selling",
              label: "See all",
            }}
            className="mb-8"
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
          className="container-page py-14"
          aria-labelledby="sale-heading"
        >
          <div className="mb-8 flex items-center gap-3">
            <Badge tone="danger">Reduced</Badge>
            <SectionHeading title="Last chance" className="flex-1" />
          </div>
          <h2 id="sale-heading" className="sr-only">
            Reduced products
          </h2>
          <ProductGrid products={sale} listName="Sale" priorityCount={0} />
        </section>
      )}

      {/* ── Assurance ────────────────────────────────────────────────── */}
      <section
        className="container-page py-14"
        aria-labelledby="promise-heading"
      >
        <h2 id="promise-heading" className="sr-only">
          Our promise
        </h2>
        <ul className="grid gap-6 rounded-xl border border-line bg-surface p-8 sm:grid-cols-3 sm:p-10">
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
              <li key={item.title} className="flex flex-col gap-2.5">
                <Icon size={26} className="text-accent" />
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

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="container-page py-14" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            title="Common questions"
            align="center"
            className="mb-8"
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
