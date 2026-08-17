"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  BagIcon,
  ChevronRightIcon,
  GridIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@/components/ui/icons";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useCart } from "@/components/cart/cart-provider";
import { SearchOverlay } from "@/components/search/search-overlay";
import { CurrencySelector } from "@/components/localization/currency-selector";
import { MobileNav } from "./mobile-nav";

export type NavChild = {
  href: string;
  label: string;
  /** Optional cover image shown in the mega menu (e.g. a collection cover). */
  image?: { url: string; alt: string } | null;
  /** Optional short caption, e.g. an item count. */
  meta?: string;
};

export type NavLink = {
  href: string;
  label: string;
  children?: NavChild[];
};

/**
 * Sticky header.
 *
 * Deliberately a constant height (64px mobile / 72px desktop) so scrolling can
 * never reflow the page beneath it. Scroll state is communicated through
 * border, shadow and background alone — see the note on the header row below
 * for why animating the height is the wrong tool for a sticky element.
 */
export function Header({
  navigation,
  popularSearches,
}: {
  navigation: NavLink[];
  popularSearches: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  // Warm accent-soft header on pages whose hero tints its top the same way
  // (About, FAQ); the default canvas header everywhere else.
  const hasTintedHero = pathname === "/about" || pathname === "/faq";
  const isHome = pathname === "/";
  const { itemCount, open, signedIn } = useCart();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  // The homepage hero is full-viewport-height with the header overlaid on
  // top of it (see hero.tsx's negative top margin) — the header stays
  // transparent with light text only for that first screen, then becomes the
  // normal solid header the instant scroll state flips. Every other route
  // never has a hero behind the header, so it always gets the solid header.
  //
  // The About page's hero tints its top with accent-soft, so the header goes
  // transparent there too (keeping dark text) and lets that tint show through
  // seamlessly; it reverts to solid accent-soft once scrolled.
  const overTintedHero = (isHome || hasTintedHero) && !scrolled;
  // Homepage-only: over the dark full-viewport hero the header needs light
  // text and an inverted (white) logo, plus light hover surfaces.
  const overHero = isHome && !scrolled;

  /*
   * Hysteresis + rAF throttle.
   *
   * A single threshold lets the flag chatter when a scroll settles right on the
   * boundary — each flip re-runs the header's transition, which reads as the
   * header "jumping" for a while. Separate enter/exit thresholds mean the state
   * cannot flip without a deliberate ~20px of travel, and rAF collapses the
   * burst of scroll events a momentum fling produces into one read per frame.
   */
  React.useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled((current) => (current ? y > 4 : y > 24));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // "/" focuses search, the way every search-first product behaves.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (event.key === "/" && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only-focusable fixed top-3 left-3 z-70 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-on-primary shadow-e3"
      >
        Skip to content
      </a>

      <header
        className={cn(
          // Over a hero the header goes transparent — the homepage hero wants
          // light text, the About hero keeps dark text but lets its own
          // accent-soft tint show through — and it becomes the default solid
          // header the instant scroll state flips. Every page (including
          // About) uses the same canvas header once scrolled, so the color
          // stays consistent across routes.
          //
          // Fixed, not sticky: a sticky element still reserves its own box in
          // normal flow, so the homepage hero (which wants to start at the
          // true top of the viewport, under this header) would need a
          // negative margin to compensate — and that margin collapses
          // through <main> onto <body>, which is what produced the stray
          // gap above the header. Fixed removes the header from flow
          // entirely; <main>'s top padding (see layout.tsx) compensates on
          // every other page, and the hero's negative margin cancels that
          // same padding cleanly, with no collapse to worry about.
          "fixed inset-x-0 top-0 z-40 border-b transition-[border-color,background-color,box-shadow,color] duration-300",
          overTintedHero
            ? cn(
                "border-transparent bg-transparent",
                overHero ? "text-white" : "text-ink",
              )
            : cn(
                "text-ink bg-canvas/85 backdrop-blur-md",
                scrolled ? "border-line shadow-e1" : "border-transparent",
              ),
        )}
      >
        <div className="container-page">
          <div
            // Constant height, deliberately.
            //
            // A sticky header is in normal flow, so animating its height
            // reflows every element below it. Worse, that reflow shifts
            // window.scrollY, which can push the scroll position back across
            // the threshold that triggered the change — the header then
            // oscillates instead of settling. Scroll state is expressed with
            // border, shadow and background only: all paint-level properties
            // that cost no layout and cannot feed back into scroll position.
            className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 sm:h-18"
          >
            {/* Left: mobile menu button / desktop logo */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Open menu"
                className={cn(
                  "-ml-2.5 grid size-11 place-items-center rounded-md transition-colors lg:hidden",
                  overHero ? "hover:bg-white/15" : "hover:bg-surface-sunken",
                )}
              >
                <MenuIcon size={26} />
              </button>

              <Link
                href="/"
                aria-label="Trackify home"
                className="hidden shrink-0 leading-none lg:block"
              >
                {/* Self-hosted site logo — same shrink-0 position as the wordmark it replaces.
                    White variant over the dark hero, not a CSS filter — a real
                    white asset instead of approximating one with invert(). */}
                <Image
                  src={overHero ? "/logo-white.png" : "/logo.png"}
                  alt="Trackify"
                  width={84}
                  height={64}
                  priority
                  className="h-9 w-auto sm:h-11"
                />
              </Link>
            </div>

            {/* Center: mobile logo / desktop nav */}
            <div className="flex min-w-0 items-center justify-center">
              {/* Hidden on mobile specifically while the transparent hero
                  header is active — the hero itself now shows its own,
                  bigger centered "Trackify" lockup just below, so this one
                  would be a redundant second logo stacked right above it. It
                  reappears the moment overHero turns off (scrolled, or any
                  other route). */}
              <Link
                href="/"
                aria-label="Trackify home"
                className={cn(
                  "shrink-0 leading-none lg:hidden",
                  overHero && "max-lg:hidden",
                )}
              >
                <Image
                  src={overHero ? "/logo-white.png" : "/logo.png"}
                  alt="Trackify"
                  width={84}
                  height={64}
                  priority
                  className="h-9 w-auto sm:h-11"
                />
              </Link>

              <NavigationMenu
                aria-label="Main"
                className="hidden min-w-0 lg:flex"
              >
                <NavigationMenuList>
                  {navigation.map((link) => {
                    const active =
                      pathname === link.href ||
                      pathname.startsWith(`${link.href}/`);

                    if (link.children && link.children.length > 0) {
                      return (
                        <NavigationMenuItem key={link.href}>
                          <NavigationMenuTrigger
                            className={cn(
                              "relative",
                              overHero &&
                                "text-white/90 hover:text-white focus:bg-white/15 data-active:text-white data-[state=open]:text-white",
                            )}
                            // Hover opens the category mega menu; a click goes to
                            // the full Shop page (all items).
                            onClick={() => router.push(link.href)}
                          >
                            {link.label}
                            {active && (
                              <span
                                className="absolute inset-x-3.5 bottom-1 h-px bg-accent"
                                aria-hidden="true"
                              />
                            )}
                          </NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <div className="w-[min(92vw,40rem)] p-2.5">
                              <p className="px-2.5 pt-1 pb-2 text-2xs font-semibold tracking-[0.16em] text-ink-subtle uppercase">
                                Shop by category
                              </p>
                              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                                {link.children.map((child) => (
                                  <NavigationMenuLink key={child.href} asChild>
                                    <Link
                                      href={child.href}
                                      className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface-sunken"
                                    >
                                      {child.image?.url ? (
                                        <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-surface-sunken">
                                          <Image
                                            src={child.image.url}
                                            alt={child.image.alt || child.label}
                                            fill
                                            sizes="44px"
                                            className="object-cover"
                                          />
                                        </span>
                                      ) : (
                                        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-surface-sunken text-ink-subtle">
                                          <GridIcon size={18} />
                                        </span>
                                      )}
                                      <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium">
                                          {child.label}
                                        </span>
                                        {child.meta && (
                                          <span className="block text-2xs text-ink-subtle">
                                            {child.meta}
                                          </span>
                                        )}
                                      </span>
                                    </Link>
                                  </NavigationMenuLink>
                                ))}
                              </div>
                              <div className="mt-1.5 border-t border-line pt-1.5">
                                <Link
                                  href={link.href}
                                  className="flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
                                >
                                  Browse all {link.label.toLowerCase()}
                                  <ChevronRightIcon size={16} />
                                </Link>
                              </div>
                            </div>
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                      );
                    }

                    return (
                      <NavigationMenuItem key={link.href}>
                        <NavigationMenuLink asChild>
                          <Link
                            href={link.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "relative inline-flex h-10 items-center rounded-md px-3.5 text-sm font-medium transition-colors",
                              overHero
                                ? active
                                  ? "text-white"
                                  : "text-white/80 hover:text-white"
                                : active
                                  ? "text-ink"
                                  : "text-ink-muted hover:text-ink",
                            )}
                          >
                            {link.label}
                            {active && (
                              <span
                                className="absolute inset-x-3.5 bottom-1 h-px bg-accent"
                                aria-hidden="true"
                              />
                            )}
                          </Link>
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
                <NavigationMenuIndicator />
              </NavigationMenu>
            </div>

            <div className="flex items-center justify-end gap-0.5">
              <div className="hidden sm:block">
                <CurrencySelector overHero={overHero} />
              </div>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className={cn(
                  "grid size-11 place-items-center rounded-md transition-colors",
                  overHero ? "hover:bg-white/15" : "hover:bg-surface-sunken",
                )}
              >
                <SearchIcon size={24} />
              </button>

              <Link
                href={signedIn ? "/account" : "/account/login"}
                aria-label={signedIn ? "Your account" : "Sign in"}
                className={cn(
                  "hidden size-11 place-items-center rounded-md transition-colors sm:grid",
                  overHero ? "hover:bg-white/15" : "hover:bg-surface-sunken",
                )}
              >
                <UserIcon size={20} />
              </Link>

              <button
                type="button"
                onClick={open}
                className={cn(
                  "relative -mr-2.5 grid size-11 place-items-center rounded-md transition-colors",
                  overHero ? "hover:bg-white/15" : "hover:bg-surface-sunken",
                )}
                aria-label={`Open bag, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
              >
                <BagIcon size={24} />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 font-display text-2xs font-semibold tracking-tight text-on-accent tabular-nums shadow-e1 ring-2 ring-canvas">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileNav
        open={navOpen}
        onClose={() => setNavOpen(false)}
        navigation={navigation}
      />
      {/* Keyed so closing the overlay discards its term and results, instead of
          reopening onto a stale search. */}
      <SearchOverlay
        key={searchOpen ? "search-open" : "search-closed"}
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        popularSearches={popularSearches}
      />
    </>
  );
}
