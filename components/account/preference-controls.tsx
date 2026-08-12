"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { CheckIcon } from "@/components/ui/icons";
import { useConsent } from "@/lib/analytics/consent-store";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useWishlist } from "@/hooks/use-wishlist";

/**
 * Device-local preferences.
 *
 * Everything here lives in this browser only — the customer can see exactly
 * what is stored and clear it, which is both a privacy requirement and a
 * useful escape hatch.
 */
export function PreferenceControls() {
  const { consent, setConsent } = useConsent();
  const [notice, setNotice] = React.useState<string | null>(null);
  const { handles: recent, clear: clearRecent } = useRecentlyViewed();
  const { handles: saved, clear: clearWishlist } = useWishlist();

  return (
    <>
      {notice && (
        <Alert tone="success" icon={<CheckIcon size={18} />}>
          {notice}
        </Alert>
      )}

      <section
        aria-labelledby="privacy-heading"
        className="rounded-lg border border-line bg-surface p-5"
      >
        <h2 id="privacy-heading" className="text-base font-medium">
          Analytics &amp; cookies
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {consent === null
            ? "You have not made a choice yet."
            : consent.analytics
              ? "Analytics are on for this browser."
              : "Analytics are off for this browser."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={consent?.analytics ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              setConsent({ analytics: true, marketing: true });
              setNotice("Preferences saved.");
            }}
          >
            Allow
          </Button>
          <Button
            variant={consent && !consent.analytics ? "primary" : "outline"}
            size="sm"
            onClick={() => {
              setConsent({ analytics: false, marketing: false });
              setNotice("Preferences saved.");
            }}
          >
            Decline
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="local-heading"
        className="rounded-lg border border-line bg-surface p-5"
      >
        <h2 id="local-heading" className="text-base font-medium">
          Stored on this device
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">Recently viewed</dt>
            <dd className="flex items-center gap-3">
              <span className="tabular-nums">{recent.length}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearRecent();
                  setNotice("Recently viewed cleared.");
                }}
                disabled={recent.length === 0}
              >
                Clear
              </Button>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-muted">Saved items</dt>
            <dd className="flex items-center gap-3">
              <span className="tabular-nums">{saved.length}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearWishlist();
                  setNotice("Saved items cleared.");
                }}
                disabled={saved.length === 0}
              >
                Clear
              </Button>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-ink-subtle">
          Saved items and recently viewed are stored in this browser only, so
          they do not follow you to another device.
        </p>
      </section>
    </>
  );
}
