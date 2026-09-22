import Image from "next/image";
import Link from "next/link";
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
 * Photography is expected to carry its own negative space for the text (see
 * lib/home/hero-images.ts) rather than relying on a darkening overlay, so
 * text here renders in dark ink, not white.
 *
 * All of the actual content — headline, copy, CTAs — is plain
 * server-rendered markup, not something the carousel injects. A crawler (or
 * a first paint before hydration) sees the complete hero immediately; only
 * the photo behind it is client-driven.
 */
export async function Hero({
  fallbackProducts,
}: {
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
      {/* Vertically centered at every breakpoint — the content block sits in
          the middle of the hero rather than anchored to the bottom. */}
      <div className="relative flex min-h-hero flex-col justify-center">
        <HeroCarousel slides={slides} mobileSlides={mobileSlides} />

        {/* Compact, deliberately: this whole block has to fit between the
            fixed header and the screen bottom on the shortest phones in
            portrait, with nothing left over to clip into the header. Sizes
            and gaps step up at sm/lg once there's more room to spend. */}
        <div className="container-page relative z-10 py-8 sm:py-16 lg:py-24">
          {/* One coherent composition, not two stitched together: mobile is
              centered start to finish (logo through button), matching how a
              full-bleed photo hero reads on a narrow screen. sm+ switches to
              the conventional left-aligned column, where there's room for it
              to read as a proper block of copy instead of a centered badge. */}
          <div className="flex flex-col items-center text-center sm:max-w-xl sm:items-start sm:text-left">
            {/* Mobile only — this space isn't empty at sm and up, where the
                header itself sits over the same photo with its full nav, so a
                second lockup there would just duplicate it. */}
            <div className="animate-fade-up mb-8 flex flex-col items-center gap-1 sm:hidden">
              <Image
                src="/logo.png"
                alt=""
                width={84}
                height={64}
                priority
                className="h-14 w-auto xs:h-16"
              />
              <p className="font-display text-3xl text-ink xs:text-4xl">
                Trackify
              </p>
              <p className="text-sm text-ink-muted">
                Considered goods, properly tracked.
              </p>
            </div>

            <h1
              className="animate-fade-up text-3xl text-ink sm:mt-4 sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "120ms" }}
            >
              Every piece earns its place.
            </h1>
            <p
              className="animate-fade-up mt-3 max-w-md text-sm leading-relaxed text-ink-muted sm:mt-5 sm:text-base"
              style={{ animationDelay: "180ms" }}
            >
              A tightly curated catalog, chosen on quality rather than
              volume, and tracked every step from checkout to your door.
            </p>
            <div
              className="animate-fade-up mt-5 flex w-full flex-col gap-2.5 sm:mt-8 sm:w-auto sm:flex-row sm:items-center sm:gap-4"
              style={{ animationDelay: "240ms" }}
            >
              <ButtonLink
                href="/collections"
                size="lg"
                className="w-full rounded-full bg-ink text-white hover:bg-ink/90 sm:w-auto"
              >
                Browse the collection
              </ButtonLink>
              <Link
                href="/about"
                className="text-sm font-medium text-ink underline underline-offset-4 transition-colors hover:text-ink-muted"
              >
                Our story
              </Link>
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
          <div className="flex h-10 w-6 animate-bounce justify-center rounded-full border-2 border-ink/40">
            <div className="mt-2 h-3 w-1 rounded-full bg-ink/60"></div>
          </div>
        </a>
      </div>
    </section>
  );
}
