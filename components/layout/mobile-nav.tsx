"use client";

import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import { ButtonLink } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useCart } from "@/components/cart/cart-provider";
import type { NavLink } from "./header";

/**
 * Mobile navigation.
 *
 * A full-height side drawer that slides in from the left edge (the header's
 * hamburger sits on the left) rather than a bottom sheet — the classic
 * mobile-menu pattern, with `forceSide` keeping it a true drawer even on
 * small screens instead of degrading to a sheet. The header shows the brand
 * (logo + tagline), the body lists the high-level destinations plus Cart and
 * Saved items, and the footer holds a single Login CTA.
 */
export function MobileNav({
  open,
  onClose,
  navigation,
}: {
  open: boolean;
  onClose: () => void;
  navigation: NavLink[];
}) {
  const { signedIn, itemCount, open: openCart } = useCart();

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      forceSide
      title="Menu"
      hideTitle
      hideHeaderBorder
      hideFooterBorder
      header={
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="Trackify"
            width={42}
            height={32}
            className="h-8 w-auto shrink-0"
          />
          <div className="min-w-0">
            <p className="font-display text-base leading-tight">Trackify</p>
            <p className="text-xs text-ink-subtle">Smart Secure Seamless</p>
          </div>
        </div>
      }
      footer={
        <ButtonLink
          href={signedIn ? "/account" : "/account/login"}
          onClick={onClose}
          variant="accent"
          size="lg"
          fullWidth
          className="rounded-xl"
        >
          {signedIn ? "Your account" : "Login to your account"}
        </ButtonLink>
      }
    >
      <div className="px-4 pt-1 pb-6">
        <nav aria-label="Mobile navigation">
          <ul className="space-y-1">
            {navigation.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="group flex min-h-12 items-center justify-between rounded-xl px-4 py-2.5 text-base font-medium text-ink transition-colors hover:bg-surface-sunken"
                >
                  {link.label}
                  <ChevronRightIcon
                    size={16}
                    className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/wishlist"
                onClick={onClose}
                className="group flex min-h-12 items-center justify-between rounded-xl px-4 py-2.5 text-base font-medium text-ink transition-colors hover:bg-surface-sunken"
              >
                Saved items
                <ChevronRightIcon
                  size={16}
                  className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openCart();
                }}
                className="group flex min-h-12 w-full items-center justify-between rounded-xl px-4 py-2.5 text-base font-medium text-ink transition-colors hover:bg-surface-sunken"
              >
                <span className="flex items-center gap-2">
                  Cart
                  {itemCount > 0 && (
                    <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 font-display text-2xs font-semibold tracking-tight text-on-accent tabular-nums">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </span>
                <ChevronRightIcon
                  size={16}
                  className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </Drawer>
  );
}
