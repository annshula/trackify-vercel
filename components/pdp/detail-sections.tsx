import Link from "next/link";
import type { CatalogFaqItem, CatalogFeatureHighlight, CatalogProductSpec } from "@/types/catalog";
import type { ShopPdpContent, ShopTrustPoint } from "@/types/shop";
import { PdpIcon } from "./pdp-icon";
import { ResponsiveDisclosure } from "./responsive-disclosure";
import { SectionHeading } from "./story-sections";

/**
 * The reassurance half of the PDP: exactly what arrives, the facts, when it
 * ships, what if it's wrong, and the remaining questions. All data comes from
 * Shopify; rows and sections with no data are omitted, never guessed.
 */

/* ── What's included + specifications + shipping ────────────────────── */

export function ProductDetails({
  included,
  specs,
  shipping,
}: {
  included: CatalogFeatureHighlight[];
  specs: CatalogProductSpec[];
  shipping: ShopPdpContent["shipping"];
}) {
  const shippingRows = [
    { label: "Processing", value: shipping.processingTime },
    { label: "Delivery", value: shipping.deliveryEstimate },
    { label: "Shipping cost", value: shipping.costNote },
    { label: "Ships to", value: shipping.regions },
  ].filter((row): row is { label: string; value: string } => Boolean(row.value));

  if (included.length === 0 && specs.length === 0 && shippingRows.length === 0) return null;

  return (
    <section aria-labelledby="details-heading" className="border-t border-line bg-surface py-20 lg:py-28">
      <div className="container-page">
        <SectionHeading id="details-heading" eyebrow="The details" title="Everything you'd want to know first" />

        <div className="mt-12 grid gap-x-16 lg:grid-cols-12 lg:gap-y-16">
          {included.length > 0 && (
            <WhatsIncluded items={included} className="lg:col-span-12" />
          )}
          {specs.length > 0 && (
            <ResponsiveDisclosure id="specs" title="Specifications" className="lg:col-span-7">
              <dl className="divide-y divide-line border-y border-line">
                {specs.map((spec) => (
                  <div key={spec.label} className="grid grid-cols-[minmax(7rem,2fr)_3fr] gap-4 py-3.5 text-sm">
                    <dt className="text-ink-muted">{spec.label}</dt>
                    <dd className="text-ink">
                      {spec.value}
                      {spec.description && <span className="mt-1 block text-ink-subtle">{spec.description}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </ResponsiveDisclosure>
          )}
          {shippingRows.length > 0 && (
            <ResponsiveDisclosure id="shipping" title="Shipping" className="lg:col-span-5">
              <dl className="divide-y divide-line border-y border-line">
                {shippingRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[minmax(7rem,2fr)_3fr] gap-4 py-3.5 text-sm">
                    <dt className="text-ink-muted">{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              <Link href="/pages/shipping" className="mt-4 inline-block text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
                Shipping details
              </Link>
            </ResponsiveDisclosure>
          )}
        </div>
      </div>
    </section>
  );
}

function WhatsIncluded({ items, className }: { items: CatalogFeatureHighlight[]; className?: string }) {
  return (
    <div className={className}>
      <h3 className="font-display text-xl">What&rsquo;s in the box</h3>
      <ul className="mt-5 mb-10 grid gap-3 sm:grid-cols-2 lg:mb-0 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-4 rounded-xl border border-line bg-surface-raised p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <PdpIcon icon={item.icon} size={22} />
            </span>
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="mt-1 text-sm leading-snug text-ink-muted">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Returns / guarantee / trust ────────────────────────────────────── */

export function ReturnsGuarantee({ points }: { points: ShopTrustPoint[] }) {
  if (points.length === 0) return null;
  return (
    <section aria-labelledby="trust-heading" className="container-page py-20 lg:py-24">
      <SectionHeading id="trust-heading" eyebrow="Buy with confidence" title="If it isn't right, we'll make it right" align="center" />
      <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {points.map((point) => (
          <li key={point.label} className="bg-surface-raised p-7">
            <PdpIcon icon={point.icon} size={26} className="text-accent" />
            <h3 className="mt-5 text-lg">{point.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{point.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Read the full{" "}
        <Link href="/pages/returns" className="underline underline-offset-4 hover:text-ink">
          returns policy
        </Link>
        .
      </p>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────────── */

/**
 * Native <details> accordion: keyboard and screen-reader support for free, no
 * client JS, and content stays in the HTML for search engines. The shared
 * `name` makes it exclusive (one open at a time) where browsers support it.
 */
export function ProductFAQ({ items, supportEmail }: { items: CatalogFaqItem[]; supportEmail: string | null }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="faq-heading" className="border-t border-line py-20 lg:py-28">
      <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading id="faq-heading" eyebrow="Questions" title="Before you buy" />
          {supportEmail && (
            <p className="mt-6 text-ink-muted">
              Didn&rsquo;t find your answer?{" "}
              <a href={`mailto:${supportEmail}`} className="text-ink underline underline-offset-4">
                {supportEmail}
              </a>
            </p>
          )}
        </div>
        <div className="pdp-faq divide-y divide-line border-y border-line lg:col-span-8">
          {items.map((item) => (
            <details key={item.question} name="pdp-faq" className="group">
              <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-6 py-4 text-left text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {item.question}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                  className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-45"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className="max-w-2xl pb-6 leading-relaxed text-ink-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
