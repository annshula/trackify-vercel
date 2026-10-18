import { Icon } from "./icon";

/**
 * Delivery estimate as a small journey: placed → a truck drives the route →
 * delivered. It shows the working-day range as written ("5–11 working days"),
 * not calendar dates, so the card never promises a day the carrier may miss.
 */
export function DeliveryTimeline({ estimate }: { estimate: string }) {
  return (
    <section
      aria-label="Estimated delivery"
      className="mt-5 overflow-hidden rounded-card bg-sage-50 p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow eyebrow-dot">Estimated delivery</p>
          <p className="mt-2 font-numeral text-heading-3 font-semibold tabular-nums text-sage-800">
            {estimate}
          </p>
          <p className="mt-0.5 text-body-sm text-ink-soft">tracked from dispatch to your door</p>
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
          <span>Ordered</span>
          <span>At your door</span>
        </div>
      </div>
    </section>
  );
}
