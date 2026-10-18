"use client";

import * as React from "react";
import { Icon } from "./icon";

/** "5–11 days", "5-11 days", "5 to 11 business days" → [5, 11]. A single number → [n, n]. */
function parseRange(estimate: string): [number, number] | null {
  const range = estimate.match(/(\d+)\s*(?:–|-|—|to)\s*(\d+)/i);
  if (range) return [Number(range[1]), Number(range[2])];
  const single = estimate.match(/(\d+)\s*(?:business\s*)?days?/i);
  return single ? [Number(single[1]), Number(single[1])] : null;
}

const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/**
 * Delivery estimate as a small journey: placed today → a truck drives the
 * route → "at your door" between two real calendar dates. The dates depend on
 * the visitor's clock, so they are worked out after mount (the page is static;
 * a server-side "today" would be stale) and the card reads fine without them.
 */
export function DeliveryTimeline({ estimate }: { estimate: string }) {
  const range = parseRange(estimate);
  const [dates, setDates] = React.useState<{ today: string; from: string; to: string } | null>(null);

  React.useEffect(() => {
    if (!range) return;
    // Today's date is only knowable in the browser; this is a one-time sync from it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDates({ today: day(0), from: day(range[0]), to: day(range[1]) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate]);

  const arrival = dates
    ? dates.from === dates.to
      ? dates.from
      : `${dates.from} – ${dates.to}`
    : null;

  return (
    <section
      aria-label="Estimated delivery"
      className="mt-5 overflow-hidden rounded-card bg-sage-50 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow eyebrow-dot">Estimated delivery</p>
          <p className="mt-2 font-numeral text-heading-3 font-semibold tabular-nums text-sage-800">
            {arrival ?? estimate}
          </p>
          <p className="mt-0.5 text-body-sm text-ink-soft">
            {arrival ? `${estimate} · ` : ""}tracked from dispatch to your door
          </p>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-sage-600 text-ivory">
          <Icon name="package" className="size-5" />
        </span>
      </div>

      {/* The route: placed → truck on the road → delivered. */}
      <div className="mt-5" aria-hidden="true">
        <div className="relative h-8">
          <span className="absolute top-1/2 right-3 left-3 -translate-y-1/2 border-t-2 border-dashed border-sage-300" />
          <span className="absolute top-1/2 left-0 size-3 -translate-y-1/2 rounded-full bg-sage-600 ring-4 ring-sage-100" />
          <span className="absolute top-1/2 right-0 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-sage-600 text-ivory ring-4 ring-sage-100">
            <Icon name="check" className="size-3" strokeWidth={2.4} />
          </span>
          <span className="absolute inset-y-0 right-3 left-3">
            <span className="absolute top-1/2 left-0 -translate-y-1/2 text-sage-700 motion-safe:animate-[delivery-drive_5s_ease-in-out_infinite]">
              <Icon name="truck" className="size-6" strokeWidth={1.7} />
            </span>
          </span>
        </div>
        <div className="mt-1.5 flex justify-between font-ui text-[0.72rem] font-medium text-ink-soft">
          <span>Ordered{dates ? ` · ${dates.today}` : " today"}</span>
          <span>{arrival ? `Delivered · ${arrival}` : "At your door"}</span>
        </div>
      </div>
    </section>
  );
}
