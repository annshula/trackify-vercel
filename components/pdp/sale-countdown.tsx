"use client";

import * as React from "react";

/**
 * Live countdown to a real sale end time (`custom.sale_ends_at` on the
 * product — an ISO datetime, set once in Shopify admin). Renders nothing
 * once that time passes rather than resetting or looping — the urgency has
 * to be true, so there's no fake deadline that never arrives.
 *
 * The date is only meaningful in the shopper's own clock, so — like
 * DeliveryEstimate's arrival dates — the countdown itself is worked out
 * after mount; the server-rendered HTML shows nothing extra to hydrate
 * mismatch against.
 */
export function SaleCountdown({ endsAt }: { endsAt: string | null }) {
  const [remainingMs, setRemainingMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    if (Number.isNaN(end)) return;

    const tick = () => setRemainingMs(Math.max(0, end - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  if (!endsAt || remainingMs === null || remainingMs <= 0) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <p
      className="mt-3 flex items-center gap-2 text-sm font-medium text-danger"
      role="timer"
      aria-live="off"
    >
      <svg
        viewBox="0 0 24 24"
        width={16}
        height={16}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
      Sale ends in{" "}
      <span
        className="tabular-nums"
        aria-label={`${hours} hours ${minutes} minutes ${seconds} seconds`}
      >
        {hours > 0 ? `${pad(hours)}:` : ""}
        {pad(minutes)}:{pad(seconds)}
      </span>
    </p>
  );
}
