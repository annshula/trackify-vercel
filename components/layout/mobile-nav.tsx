"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Drawer } from "@/components/ui/drawer";
import { Button, ButtonLink } from "@/components/ui/button";
import { ChevronRightIcon, LogoutIcon } from "@/components/ui/icons";
import { useCart } from "@/components/cart/cart-provider";
import { CurrencySelector } from "@/components/localization/currency-selector";
import type { NavLink } from "./header";

/**
 * Mobile navigation.
 *
 * A full-height side drawer that slides in from the left edge (the header's
 * hamburger sits on the left) rather than a bottom sheet — the classic
 * mobile-menu pattern, with `forceSide` keeping it a true drawer even on
 * small screens instead of degrading to a sheet. The header shows the brand
 * (logo + tagline), the body lists the high-level destinations plus Cart and
 * Saved items, and the footer holds Sign out (signed-in only, confirmed
 * inline rather than immediately) above the main account CTA.
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
  const { signedIn } = useCart();
  const [confirmingSignOut, setConfirmingSignOut] = React.useState(false);

  // Closing the drawer any other way (backdrop, Escape, a link navigating
  // away) should not leave a pending "sign out?" confirmation waiting for
  // the next time it opens.
  const handleClose = () => {
    setConfirmingSignOut(false);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      side="left"
      forceSide
      title="Menu"
      hideTitle
      hideHeaderBorder
      hideFooterBorder
      header={
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo.png"
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
          <CurrencySelector />
        </div>
      }
      footer={
        <div className="space-y-2.5">
          {signedIn &&
            (confirmingSignOut ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-danger-soft px-3.5 py-2.5">
                <p className="text-sm font-medium text-danger">
                  Sign out of your account?
                </p>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingSignOut(false)}
                  >
                    Cancel
                  </Button>
                  {/* A real navigation, not a client-side mutation: /account/logout
                      clears the local session, then redirects through Shopify's
                      own end-session endpoint so the account is actually signed
                      out there too, not just locally. */}
                  <ButtonLink
                    href="/account/logout"
                    prefetch={false}
                    onClick={handleClose}
                    variant="danger"
                    size="sm"
                  >
                    Sign out
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingSignOut(true)}
                className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-danger"
              >
                <LogoutIcon size={16} />
                Sign out
              </button>
            ))}

          <ButtonLink
            href={signedIn ? "/account" : "/account/login"}
            onClick={handleClose}
            variant="accent"
            size="lg"
            fullWidth
            className="rounded-xl"
          >
            {signedIn ? "Your account" : "Login to your account"}
          </ButtonLink>
        </div>
      }
    >
      <div className="px-4 pt-1 pb-6">
        <nav aria-label="Mobile navigation">
          <ul className="space-y-1">
            {navigation.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={handleClose}
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
                onClick={handleClose}
                className="group flex min-h-12 items-center justify-between rounded-xl px-4 py-2.5 text-base font-medium text-ink transition-colors hover:bg-surface-sunken"
              >
                Saved items
                <ChevronRightIcon
                  size={16}
                  className="shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </Drawer>
  );
}
