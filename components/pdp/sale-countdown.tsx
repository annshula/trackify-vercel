"use client";

import * as React from "react";
import { Icon } from "./icon";

/** Digits only, no design decisions — remaining time to a real, merchant-set Shopify deadline. */
function remaining(target: number): { hours: number; minutes: number; seconds: number } | null {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const pad = (n: number) => n.toString().padStart(2, "0");

/**
 * Offer countdown — only ever renders a deadline the merchant actually set in
 * Shopify (`custom.sale_ends_at`), and hides itself the moment that deadline
 * passes rather than freezing at 00:00:00 or looping.
 *
 * The time left depends on the visitor's clock, which the server can't know
 * (worse with ISR: the HTML may be hours old). It is therefore computed in an
 * effect after mount — computing it in a `useState` initializer would make the
 * server text disagree with the client's first render, a hydration mismatch.
 */
export function SaleCountdown({
  endsAt,
  variant = "bar",
}: {
  endsAt: string | null;
  /** "bar": full-width strip for the top of the page. "inline": compact chip beside the price. */
  variant?: "bar" | "inline";
}) {
  const target = endsAt ? Date.parse(endsAt) : Number.NaN;
  const [left, setLeft] = React.useState<ReturnType<typeof remaining>>(null);

  React.useEffect(() => {
    if (Number.isNaN(target)) return;
    // The deadline is only meaningful against the visitor's clock, known only after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeft(remaining(target));
    const id = setInterval(() => setLeft(remaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!left) return null;

  const units = [
    { label: "hours", value: left.hours },
    { label: "minutes", value: left.minutes },
    { label: "seconds", value: left.seconds },
  ];

  if (variant === "inline") {
    return (
      <div className="w-full sm:w-auto" role="timer" aria-live="off">
        {/* Phones: a full-width "rush" bar so the deadline never sits alone as a
            stray chip. From sm up the same box sits beside the delivery strip. */}
        <p className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-clay-300 bg-clay-50 px-3 py-1.5 font-ui text-[0.78rem] font-semibold text-clay-600 sm:inline-flex sm:w-auto sm:border-0 sm:bg-transparent sm:px-1 sm:py-0">
          <Icon
            name="clock"
            className="size-4 shrink-0 motion-safe:animate-[free-pop_1.2s_ease-in-out_infinite]"
          />
          <span>Hurry! Offer ends in</span>
          <span
            className="flex items-center gap-0.5 font-numeral text-[0.9rem] font-bold tabular-nums"
            aria-hidden="true"
          >
            {units.map((u, i) => (
              <span key={u.label} className="flex items-center gap-0.5">
                {i > 0 && <span className="opacity-70">:</span>}
                <span className="min-w-5 text-center">{pad(u.value)}</span>
              </span>
            ))}
          </span>
        </p>
        <span className="sr-only">
          Offer ends in {left.hours} hours {left.minutes} minutes
        </span>
      </div>
    );
  }

  /* A full-width strip at the very top of the product page, so the deadline is
     the first thing seen. Screen readers get one plain sentence instead of the
     ticking digits. */
  return (
    <div className="bg-clay-600 text-ivory" role="timer" aria-live="off">
      <p className="container-page flex items-center justify-center gap-3 py-2.5 font-ui text-body-sm font-medium">
        <Icon name="clock" className="size-4 shrink-0" />
        <span>Offer ends in</span>
        <span
          className="flex items-center gap-1 font-numeral font-semibold tabular-nums"
          aria-hidden="true"
        >
          {units.map((u, i) => (
            <span key={u.label} className="flex items-center gap-1">
              {i > 0 && <span className="opacity-70">:</span>}
              <span className="min-w-8 rounded-md bg-ivory/15 px-1.5 py-0.5 text-center">
                {pad(u.value)}
              </span>
            </span>
          ))}
        </span>
        <span className="sr-only">
          {left.hours} hours {left.minutes} minutes left
        </span>
      </p>
    </div>
  );
}
