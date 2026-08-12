import type { CatalogProduct } from "@/types/catalog";
import { primaryImage, imageAlt } from "@/lib/utils/image";
import { listHeroImages, listHeroMobileImages } from "@/lib/home/hero-images";
import { ButtonLink } from "@/components/ui/button";
import { HeroCarousel, type HeroSlide } from "./hero-carousel";

/**
 * Full-bleed hero with a rotating photo backdrop.
 *
 * The backdrop favours whatever photography lives in public/hero/ (drop files
 * in, no code change needed); with that folder empty it falls back to real
 * catalog photos so the slideshow is never blank for any store's catalog.
 *
 * All of the actual content — eyebrow, headline, copy, CTAs — is plain
 * server-rendered markup, not something the carousel injects. A crawler (or
 * a first paint before hydration) sees the complete hero immediately; only
 * the photo behind it is client-driven.
 */
export async function Hero({
  heroProduct,
  fallbackProducts,
}: {
  heroProduct: CatalogProduct;
  fallbackProducts: CatalogProduct[];
}) {
  const [custom, customMobile] = await Promise.all([
    listHeroImages(),
    listHeroMobileImages(),
  ]);

  const slides: HeroSlide[] =
    custom.length > 0
      ? custom.map((src) => ({ src, alt: "" }))
      : fallbackProducts
          .map((product) => {
            const image = primaryImage(product);
            return image
              ? { src: image.url, alt: imageAlt(image, product.title) }
              : null;
          })
          .filter((slide): slide is HeroSlide => slide !== null)
          .slice(0, 5);

  // Mobile-only cover (public/hero/mobile/) takes precedence over the fallback
  // photo used on small screens; desktop never sees it.
  const mobileSlides: HeroSlide[] = customMobile.map((src) => ({
    src,
    alt: "",
  }));

  return (
    // -mt-16/-mt-18 exactly cancels the header's own height (h-16/h-18 in
    // header.tsx) so this section starts at the true top of the viewport,
    // with the fixed, transparent-over-hero header floating on top of it
    // instead of pushing it down. min-h-screen (100vh) is a fallback for
    // browsers that don't understand dvh; min-h-dvh is what actually wins
    // everywhere modern, since mobile browser chrome showing/hiding
    // shouldn't leave a gap or crop the bottom.
    <section className="relative -mt-16 overflow-hidden bg-primary sm:-mt-18">
      {/* Bottom-anchored, not centered: with the copy trimmed to eyebrow +
          headline + one line + one button, this block is short enough to
          never reach the header on any real phone height, and bottom
          placement reads as an intentional hero composition rather than a
          floating dialog in the middle of the photo. */}
      <div className="relative flex min-h-hero flex-col justify-end">
        <HeroCarousel slides={slides} mobileSlides={mobileSlides} />

        {/* Compact, deliberately: this whole block has to fit between the
            fixed header and the screen bottom on the shortest phones in
            portrait, with nothing left over to clip into the header. Sizes
            and gaps step up at sm/lg once there's more room to spend. */}
        <div className="container-page relative z-10 py-8 sm:py-16 lg:py-24">
          {/* Mobile only — this space isn't empty at sm and up, where the
              header itself sits over the same photo with its full nav, so a
              second lockup there would just duplicate it. */}
          <div className="text-shadow-hero animate-fade-up mb-10 flex flex-col items-center gap-1 text-center sm:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt=""
              width={84}
              height={64}
              className="h-10 w-auto brightness-0 invert xs:h-11"
            />
            <p className="font-display text-xl text-white xs:text-2xl">
              Trackify
            </p>
            <p className="text-sm text-white/70">Smart. Secure. Seamless.</p>
          </div>

          <div className="text-shadow-hero max-w-xl">
            <p
              className="animate-fade-up text-2xs font-semibold tracking-[0.2em] text-white/80 uppercase"
              style={{ animationDelay: "60ms" }}
            >
              {heroProduct.productType || "New arrivals"}
            </p>
            <h1
              className="animate-fade-up mt-2.5 text-3xl text-white sm:mt-4 sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "120ms" }}
            >
              Find the perfect gear to complete your everyday carry.
            </h1>
            <p
              className="animate-fade-up mt-3 max-w-md text-sm leading-relaxed text-white/85 sm:mt-5 sm:text-base"
              style={{ animationDelay: "180ms" }}
            >
              A tight edit of trackers, wallets and EDC essentials, chosen to
              earn their place — and tracked from checkout to doorstep.
            </p>
            <div
              className="animate-fade-up mt-5 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:gap-3"
              style={{ animationDelay: "240ms" }}
            >
              {/* text-shadow-none cancels the hero's inherited text-shadow —
                  the white button's dark label needs no shadow. */}
              <ButtonLink
                href="/collections"
                size="lg"
                className="w-full rounded-full bg-white text-ink hover:bg-white/90 sm:w-auto text-shadow-none"
              >
                Shop now
              </ButtonLink>
            </div>
          </div>
        </div>

        {/* Desktop/tablet affordance only — mobile already relies on the
            obvious swipe-to-scroll gesture, and the room it would take here
            is worth more spent on the CTA block above on short screens. */}
        <a
          href="#new-collection"
          aria-label="Scroll to new collection"
          className="absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 sm:block"
        >
          <div className="flex h-10 w-6 animate-bounce justify-center rounded-full border-2 border-white/50">
            <div className="mt-2 h-3 w-1 rounded-full bg-white/70"></div>
          </div>
        </a>
      </div>
    </section>
  );
}
