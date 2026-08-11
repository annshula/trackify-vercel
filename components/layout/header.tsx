"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

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
 * Compact by default and slightly more compact once scrolled, so the viewport
 * belongs to the product rather than the chrome. The mobile row is a single
 * 56px band with three touch targets.
 */
export function Header({
  navigation,
  popularSearches,
}: {
  navigation: NavLink[];
  popularSearches: string[];
}) {
  const pathname = usePathname();
  // Warm accent-soft header only on the About page (matches its hero); the
  // default canvas header everywhere else.
  const isAbout = pathname === "/about";
  const { totalQuantity, open, signedIn } = useCart();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
          // Warm accent-soft tint only on the About page (matches its hero);
          // the default canvas header everywhere else. The colour never
          // changes on scroll — only the border/shadow do.
          "sticky top-0 z-40 border-b transition-[border-color,background-color,box-shadow] duration-300",
          isAbout ? "bg-accent-soft" : "bg-canvas/85 backdrop-blur-md",
          scrolled ? "border-line shadow-e1" : "border-transparent",
        )}
      >
        <div className="container-page">
          <div
            className={cn(
              // On desktop the nav sits in the center column of an equal-width
              // grid, so it centers to the screen — not between the logo and
              // the action buttons. Mobile keeps the left/right flex layout.
              "flex items-center justify-between gap-3 transition-[height] duration-300 ease-out-soft lg:grid lg:grid-cols-[1fr_auto_1fr]",
              scrolled ? "h-14" : "h-16 sm:h-20",
            )}
          >
            {/* Left: mobile menu + logo */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                aria-label="Open menu"
                className="-ml-2.5 grid size-11 place-items-center rounded-md text-ink transition-colors hover:bg-surface-sunken lg:hidden"
              >
                <MenuIcon size={22} />
              </button>

              <Link
                href="/"
                aria-label="Trackify home"
                className="shrink-0 leading-none"
              >
                {/* Self-hosted site logo — same shrink-0 position as the wordmark it replaces. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  alt="Trackify"
                  width={84}
                  height={64}
                  className="h-9 w-auto sm:h-11"
                />
              </Link>
            </div>

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
                        <NavigationMenuTrigger className="relative">
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
                            active
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

            <div className="flex items-center justify-end gap-0.5">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="grid size-11 place-items-center rounded-md text-ink transition-colors hover:bg-surface-sunken"
              >
                <SearchIcon size={20} />
              </button>

              <div className="hidden sm:block">
                <ThemeToggle />
              </div>

              <Link
                href={signedIn ? "/account" : "/account/login"}
                aria-label={signedIn ? "Your account" : "Sign in"}
                className="hidden size-11 place-items-center rounded-md text-ink transition-colors hover:bg-surface-sunken sm:grid"
              >
                <UserIcon size={20} />
              </Link>

              <button
                type="button"
                onClick={open}
                className="relative -mr-2.5 grid size-11 place-items-center rounded-md text-ink transition-colors hover:bg-surface-sunken"
                aria-label={`Open bag, ${totalQuantity} item${totalQuantity === 1 ? "" : "s"}`}
              >
                <BagIcon size={20} />
                {totalQuantity > 0 && (
                  <span className="absolute top-1 right-1 grid min-w-4.5 place-items-center rounded-full bg-accent px-1 text-2xs font-bold text-on-accent tabular-nums">
                    {totalQuantity > 99 ? "99+" : totalQuantity}
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
