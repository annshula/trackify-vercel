import Image from "next/image";
import Link from "next/link";

import type { CatalogCollection, CatalogProduct } from "@/types/catalog";
import type { ShopContentBlock, ShopTrustPoint } from "@/types/shop";
import type { StoreReview } from "@/services/reviews/judgeme";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { PdpIcon } from "@/components/pdp/pdp-icon";
import { StarIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/utils/money";
import { primaryImage } from "@/lib/utils/image";
import { cn } from "@/lib/utils/cn";

/**
 * Homepage sections below the hero.
 *
 * Every section takes real data (catalog, Judge.me, or shop metafields
 * `custom.home_*` — see scripts/pdp-content/_shop.ts) and renders nothing
 * when its data is missing, so an unconfigured store shows a shorter page,
 * never placeholder copy. Server components only; the one interactive piece
 * (product quick-add) lives inside ProductCard.
 */

/* ── Shared ─────────────────────────────────────────────────────────── */

function Eyebrow({ children, inverse }: { children: React.ReactNode; inverse?: boolean }) {
  return (
    <p className={cn("text-2xs font-semibold tracking-[0.2em] uppercase", inverse ? "text-accent-soft" : "text-accent")}>
      {children}
    </p>
  );
}

function TextLink({ href, children, inverse }: { href: string; children: React.ReactNode; inverse?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline",
        inverse ? "text-ink-inverse" : "text-ink",
      )}
    >
      {children}
      <ChevronRightIcon size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

/* ── 1. Trust bar ───────────────────────────────────────────────────── */

export function TrustBar({
  points,
  rating,
}: {
  points: ShopTrustPoint[];
  rating: { average: number; total: number } | null;
}) {
  if (points.length === 0 && !rating) return null;
  return (
    <section aria-label="Why shop with us" className="border-y border-line bg-surface">
      <ul className="container-page grid grid-cols-2 gap-x-4 gap-y-3 py-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-6">
        {rating && (
          <li className="col-span-2 flex items-center gap-2 text-sm sm:col-span-1">
            <StarIcon size={16} fillLevel={1} className="text-accent" aria-hidden="true" />
            <span className="font-medium tabular-nums">{rating.average.toFixed(1)}</span>
            <span className="text-ink-muted">
              from {rating.total.toLocaleString("en-US")} reviews
            </span>
          </li>
        )}
        {points.map((point) => (
          <li key={point.label} className="flex items-center gap-2 text-sm text-ink-muted">
            <PdpIcon icon={point.icon} size={18} className="shrink-0 text-accent" />
            {point.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 2. Featured products ───────────────────────────────────────────── */

export function FeaturedProducts({
  collection,
  products,
}: {
  collection: CatalogCollection | null;
  products: CatalogProduct[];
}) {
  if (products.length === 0) return null;
  const href = collection ? `/collections/${collection.handle}` : "/collections";
  return (
    <section aria-labelledby="featured-heading" className="py-20 lg:py-28">
      <div className="container-page flex items-end justify-between gap-6">
        <div>
          <Eyebrow>Most loved</Eyebrow>
          <h2 id="featured-heading" className="mt-3 text-3xl">
            {collection?.title ?? "Best sellers"}
          </h2>
          <p className="mt-2 max-w-md text-ink-muted">What customers keep coming back for.</p>
        </div>
        <div className="hidden sm:block">
          <TextLink href={href}>Shop all</TextLink>
        </div>
      </div>

      {/* Phones: a swipeable rail (one and a bit cards visible, so it reads as
          scrollable). From sm: a regular grid. */}
      <ul className="container-page mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 sm:overflow-visible lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {products.map((product, index) => (
          <li key={product.id} className="relative w-[78%] shrink-0 snap-start sm:w-auto">
            <ProductCard
              product={product}
              index={index}
              listName="Home: best sellers"
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 78vw"
            />
          </li>
        ))}
      </ul>

      <div className="container-page mt-10 flex justify-center">
        <ButtonLink href={href} size="lg" className="rounded-full px-10">
          Shop all
        </ButtonLink>
      </div>
    </section>
  );
}

/* ── 3. Brand value ─────────────────────────────────────────────────── */

export function BrandValueSection({ blocks }: { blocks: ShopContentBlock[] }) {
  const [lead, ...points] = blocks;
  if (!lead) return null;
  return (
    <section aria-labelledby="value-heading" className="bg-surface py-20 lg:py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        {lead.image && (
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-sunken">
            <Image
              src={lead.image.url}
              alt={lead.image.altText || "A selection of Trackify products laid out together"}
              fill
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <div className="max-w-xl">
          <Eyebrow>Why these products</Eyebrow>
          <h2 id="value-heading" className="mt-3 text-3xl text-balance lg:text-4xl">
            {lead.label}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted text-pretty">{lead.body}</p>
          {points.length > 0 && (
            <ul className="mt-8 space-y-5">
              {points.map((point) => (
                <li key={point.label} className="flex gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <PdpIcon icon={point.icon} size={20} />
                  </span>
                  <div>
                    <p className="font-medium">{point.label}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-9">
            <ButtonLink href="/collections" variant="outline" size="lg" className="rounded-full">
              Explore the collection
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 4. Categories ──────────────────────────────────────────────────── */

export function CategoryGrid({
  categories,
  products,
}: {
  categories: CatalogCollection[];
  products: CatalogProduct[];
}) {
  if (categories.length < 2) return null;
  return (
    <section aria-labelledby="categories-heading" className="container-page py-20 lg:py-28">
      <div className="flex items-end justify-between gap-6">
        <div>
          <Eyebrow>Shop by category</Eyebrow>
          <h2 id="categories-heading" className="mt-3 text-3xl">
            Find what fits your day
          </h2>
        </div>
        <div className="hidden sm:block">
          <TextLink href="/collections">All categories</TextLink>
        </div>
      </div>

      {/* The first (largest) category leads: full width on phones, a double
          tile on desktop — seven categories then fill a 4 × 2 grid exactly. */}
      <ul className="mt-10 grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] sm:gap-4 lg:grid-cols-4 lg:auto-rows-[15rem]">
        {categories.map((category, index) => {
          const image =
            category.image ??
            primaryImage(products.find((p) => p.collections.some((c) => c.id === category.id)) ?? products[0]!);
          const description = category.description.split(/(?<=[.!?])\s/)[0];
          return (
            <li key={category.id} className={cn(index === 0 && "col-span-2 row-span-1 lg:row-span-1")}>
              <Link
                href={`/collections/${category.handle}`}
                className="group relative block size-full overflow-hidden rounded-2xl bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {image && (
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes={index === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                    className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                )}
                <span className="absolute inset-0 bg-linear-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                  <span className="min-w-0">
                    <span className="block font-display text-lg leading-tight text-white sm:text-xl">{category.title}</span>
                    {index === 0 && description && (
                      <span className="mt-1 hidden max-w-sm text-sm text-white/80 sm:block">{description}</span>
                    )}
                    <span className="mt-1 block text-xs text-white/70">
                      {category.productIds.length} product{category.productIds.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/90 text-ink transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true">
                    <ChevronRightIcon size={16} />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ── 5. Lifestyle ───────────────────────────────────────────────────── */

export function LifestyleStory({ block }: { block: ShopContentBlock | undefined }) {
  if (!block?.image) return null;
  return (
    <section aria-labelledby="lifestyle-heading" className="bg-primary text-ink-inverse">
      <div className="container-page grid items-center gap-10 py-20 lg:grid-cols-12 lg:gap-16 lg:py-24">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:col-span-7 lg:aspect-[5/4]">
          <Image
            src={block.image.url}
            alt={block.image.altText || block.label}
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="lg:col-span-5">
          <Eyebrow inverse>Everyday, but better</Eyebrow>
          <h2 id="lifestyle-heading" className="mt-4 text-4xl text-balance">
            {block.label}
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-inverse/75 text-pretty">{block.body}</p>
          <div className="mt-8">
            <TextLink href="/collections" inverse>
              Discover the range
            </TextLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 6. Social proof + customer photos ──────────────────────────────── */

const ANONYMOUS = /^(anonymous|customer|verified customer)$/i;

export function Testimonials({
  rating,
  reviews,
  products,
}: {
  rating: { average: number; total: number } | null;
  reviews: StoreReview[];
  products: CatalogProduct[];
}) {
  if (!rating || reviews.length === 0) return null;
  const productById = new Map(products.map((p) => [p.id, p]));
  const productFor = (review: StoreReview) =>
    review.productExternalId ? productById.get(`gid://shopify/Product/${review.productExternalId}`) : undefined;

  // Photo strip: one photo per review, spread across products.
  const photos = pickPhotos(reviews, 8);

  return (
    <section aria-labelledby="reviews-heading" className="py-20 lg:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Customer reviews</Eyebrow>
          <h2 id="reviews-heading" className="mt-3 text-3xl text-balance lg:text-4xl">
            In their words
          </h2>
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 text-ink-muted">
            <span className="inline-flex text-accent" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <StarIcon key={i} size={16} fillLevel={Math.max(0, Math.min(1, rating.average - i))} />
              ))}
            </span>
            <span>
              <span className="font-medium text-ink">{rating.average.toFixed(1)} out of 5</span> from{" "}
              {rating.total.toLocaleString("en-US")} reviews
            </span>
          </p>
        </div>

        {/* grid-cols-1 is explicit: an implicit track sizes to its widest
            content (a long product title) and overflowed phones sideways. */}
        <ul className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => {
            const product = productFor(review);
            const photo = review.attachments[0];
            return (
              <li key={review.id} className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface-raised p-6">
                <span className="inline-flex text-accent" role="img" aria-label={`Rated ${review.rating} out of 5`}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon key={i} size={14} fillLevel={i < review.rating ? 1 : 0} />
                  ))}
                </span>
                <blockquote className="mt-4 flex-1 leading-relaxed text-ink text-pretty">
                  “{clip(review.body, 220)}”
                </blockquote>
                <div className="mt-6 flex items-center gap-3 border-t border-line pt-4">
                  {photo && (
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
                      <Image src={photo} alt={`Photo from this review of ${review.productTitle ?? "the product"}`} fill sizes="48px" className="object-cover" />
                    </span>
                  )}
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{reviewerLabel(review)}</p>
                    {product ? (
                      <Link href={`/products/${product.handle}`} className="block truncate text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                        {product.title}
                      </Link>
                    ) : review.productTitle ? (
                      <p className="truncate text-ink-muted">{review.productTitle}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {photos.length >= 4 && (
        <div className="mt-16">
          <div className="container-page">
            <h3 className="font-display text-xl">See it in the real world</h3>
            <p className="mt-1 text-sm text-ink-muted">Photos customers attached to their reviews.</p>
          </div>
          <ul className="container-page mt-6 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] lg:grid lg:grid-cols-8 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {photos.map(({ url, review }) => {
              const product = productFor(review);
              const inner = (
                <Image
                  src={url}
                  alt={`Customer photo of ${review.productTitle ?? "a Trackify product"}`}
                  fill
                  sizes="(min-width: 1024px) 12vw, 40vw"
                  className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105 motion-reduce:transition-none"
                />
              );
              return (
                <li key={url} className="relative aspect-square w-[38%] shrink-0 snap-start overflow-hidden rounded-xl bg-surface-sunken sm:w-[24%] lg:w-auto">
                  {product ? (
                    <Link href={`/products/${product.handle}`} className="group absolute inset-0">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/**
 * The reviewer's real name when Judge.me has one; otherwise "Anonymous",
 * which is exactly what Judge.me stores for them (imported AliExpress reviews
 * all share one anonymous reviewer). Never an invented name.
 */
function reviewerLabel(review: StoreReview): string {
  return ANONYMOUS.test(review.author.trim()) ? "Anonymous" : review.author;
}

function clip(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max)).replace(/[,;:.\s]+$/, "")}…`;
}

function pickPhotos(reviews: StoreReview[], limit: number) {
  const perProduct = new Map<number | null, number>();
  const out: { url: string; review: StoreReview }[] = [];
  for (const review of reviews) {
    const url = review.attachments[0];
    if (!url) continue;
    const count = perProduct.get(review.productExternalId) ?? 0;
    if (count >= 2) continue;
    perProduct.set(review.productExternalId, count + 1);
    out.push({ url, review });
    if (out.length === limit) break;
  }
  return out;
}

/* ── 7. Spotlight ───────────────────────────────────────────────────── */

export function FeaturedProductSpotlight({ product }: { product: CatalogProduct | null }) {
  if (!product) return null;
  const subtitle = product.metafields["custom.subtitle"];
  // Prefer the product's own lifestyle shot (its story image), then any photo.
  const image = product.pdp.story[1]?.image ?? product.featureHighlights[0]?.image ?? primaryImage(product);
  const benefits = product.pdp.benefits.slice(0, 3);
  const rating = ratingOf(product);
  const price = product.priceRange.min;

  return (
    <section aria-labelledby="spotlight-heading" className="bg-surface-sunken py-20 lg:py-28">
      <div className="container-page grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <div className="order-2 max-w-xl lg:order-1">
          <Eyebrow>In the spotlight</Eyebrow>
          <h2 id="spotlight-heading" className="mt-3 text-3xl text-balance lg:text-4xl">
            {product.title}
          </h2>
          {rating && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted">
              <StarIcon size={14} fillLevel={1} className="text-accent" aria-hidden="true" />
              <span className="font-medium text-ink">{rating.value.toFixed(1)}</span>
              <span>· {rating.count} reviews</span>
            </p>
          )}
          {subtitle && <p className="mt-5 text-lg leading-relaxed text-ink-muted text-pretty">{subtitle}</p>}
          {benefits.length > 0 && (
            <ul className="mt-7 grid grid-cols-3 gap-2 sm:gap-3">
              {benefits.map((benefit) => (
                <li key={benefit.label} className="rounded-xl bg-surface-raised p-3 sm:p-4">
                  <PdpIcon icon={benefit.icon} size={20} className="text-accent" />
                  <p className="mt-2 text-sm font-medium">{benefit.label}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <ButtonLink href={`/products/${product.handle}`} size="lg" className="rounded-full px-9">
              Shop now
            </ButtonLink>
            <span className="font-display text-xl tabular-nums">
              {product.priceRange.max > price && "From "}
              {formatMoney(price, product.priceRange.currencyCode, { trimZeroCents: true })}
            </span>
          </div>
        </div>
        {image && (
          <div className="relative order-1 aspect-[4/5] overflow-hidden rounded-2xl bg-surface-raised shadow-e3 lg:order-2">
            <Image
              src={image.url}
              alt={image.altText || product.title}
              fill
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ratingOf(product: CatalogProduct): { value: number; count: number } | null {
  try {
    const value = Number(JSON.parse(product.metafields["reviews.rating"] ?? "null")?.value);
    const count = Number(product.metafields["reviews.rating_count"]);
    return Number.isFinite(value) && count > 0 ? { value, count } : null;
  } catch {
    return null;
  }
}

/* ── 8. Why choose us ───────────────────────────────────────────────── */

export function WhyChooseUs({ items }: { items: ShopContentBlock[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="why-heading" className="container-page py-20 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <Eyebrow>Why shop here</Eyebrow>
          <h2 id="why-heading" className="mt-3 text-3xl text-balance">
            A smaller shop, on purpose.
          </h2>
        </div>
        <ul className="grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:col-span-8">
          {items.map((item) => (
            <li key={item.label} className="border-t border-line pt-6">
              <PdpIcon icon={item.icon} size={24} className="text-accent" />
              <h3 className="mt-4 text-lg">{item.label}</h3>
              <p className="mt-2 leading-relaxed text-ink-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 9. Brand story ─────────────────────────────────────────────────── */

export function BrandStory({ block }: { block: ShopContentBlock | undefined }) {
  if (!block) return null;
  return (
    <section aria-labelledby="story-heading" className="bg-surface py-20 lg:py-28">
      <div className="container-page grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
        {block.image && (
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface-sunken lg:col-span-5">
            <Image
              src={block.image.url}
              alt={block.image.altText || "Trackify tracker card in use"}
              fill
              sizes="(min-width: 1024px) 38vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <div className="lg:col-span-6 lg:col-start-7">
          <Eyebrow>Our story</Eyebrow>
          <h2 id="story-heading" className="mt-3 text-3xl text-balance lg:text-4xl">
            {block.label}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-muted text-pretty">{block.body}</p>
          <div className="mt-8">
            <TextLink href="/about">Read our story</TextLink>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 10. FAQ ────────────────────────────────────────────────────────── */

export function HomepageFAQ({ items }: { items: { question: string; answer: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="home-faq-heading" className="container-page py-20 lg:py-28">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <Eyebrow>Good to know</Eyebrow>
          <h2 id="home-faq-heading" className="mt-3 text-3xl">
            Questions, answered
          </h2>
          <div className="mt-6">
            <TextLink href="/faq">View all FAQs</TextLink>
          </div>
        </div>
        {/* Native <details>: accessible, no client JS; styles shared with the PDP FAQ. */}
        <div className="pdp-faq divide-y divide-line border-y border-line lg:col-span-8">
          {items.map((item) => (
            <details key={item.question} name="home-faq" className="group">
              <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-6 py-4 text-left text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {item.question}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-45">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="max-w-2xl pb-6 leading-relaxed text-ink-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 11. Final CTA ──────────────────────────────────────────────────── */

export function FinalCTA({ productCount, categories }: { productCount: number; categories: string[] }) {
  const named = categories.slice(0, 3).map((title) => title.toLowerCase());
  return (
    <section aria-labelledby="final-heading" className="container-page pb-20 lg:pb-28">
      <div className="rounded-3xl bg-primary px-6 py-16 text-center text-ink-inverse sm:px-12 lg:py-24">
        <h2 id="final-heading" className="mx-auto max-w-2xl text-4xl text-balance">
          Find something you’ll reach for every day.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-ink-inverse/75">
          {named.length > 0
            ? `${productCount} products across ${named.join(", ")}${categories.length > 3 ? " and more" : ""}.`
            : "Explore the full collection."}
        </p>
        <div className="mt-9">
          <ButtonLink href="/collections" size="lg" className="rounded-full bg-accent px-10 text-on-accent hover:bg-accent-hover">
            Shop all products
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
