import type { CatalogFaqItem, CatalogFeatureHighlight, CatalogProductSpec } from "@/types/catalog";
import type { ShopTrustPoint } from "@/types/shop";
import { Icon } from "./icon";
import { LoadingImage } from "./loading-image";
import { PdpIcon } from "./pdp-icon";
import { SectionHeading } from "./section-heading";

/**
 * The reassurance half of the PDP, exactly what arrives,
 * the facts, what if it's wrong, and the remaining questions. All data comes
 * from Shopify; rows and sections with no data are omitted, never guessed.
 */

/* ── Specifications + what's in the box ─────────────────────────────── */

export function ProductDetails({
  included,
  specs,
}: {
  included: CatalogFeatureHighlight[];
  specs: CatalogProductSpec[];
}) {
  if (included.length === 0 && specs.length === 0) return null;
  const both = specs.length > 0 && included.length > 0;
  // Specs the merchant attached a photo or infographic to read best as cards;
  // every spec, photographed or not, still has its row in the table below.
  const pictured = specs.filter((spec) => spec.image);

  return (
    <section className="py-12 lg:py-16" aria-labelledby="details">
      <div className="container-page">
        <h2
          id="details"
          className="text-center font-pdp-heading text-heading-1 font-semibold"
        >
          {specs.length > 0 ? "Specifications" : "What's in the box"}
        </h2>

        {pictured.length > 0 && (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pictured.map((spec) => (
              <li
                key={spec.label}
                className="overflow-hidden rounded-media bg-porcelain shadow-soft"
              >
                <div className="relative aspect-square">
                  <LoadingImage
                    src={spec.image!.url}
                    alt={spec.image!.altText || spec.label}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-5">
                  <p className="eyebrow">{spec.label}</p>
                  <p className="mt-2 font-serif text-heading-3">{spec.value}</p>
                  {spec.description && (
                    <p className="mt-1 text-body-sm text-ink-soft">{spec.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div
          className={
            both
              ? "mt-8 grid gap-8 lg:grid-cols-2 lg:gap-16"
              : "mx-auto mt-8 max-w-3xl"
          }
        >
          {specs.length > 0 && (
            <dl className="h-fit overflow-hidden rounded-card bg-porcelain text-body-sm shadow-soft">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-5 py-3 even:bg-cream/60"
                >
                  <dt className="text-ink-soft">{spec.label}</dt>
                  <dd>
                    {spec.value}
                    {spec.description && (
                      <span className="mt-1 block text-ink-faint">{spec.description}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {included.length > 0 && (
            <div>
              {specs.length > 0 && <h3 className="eyebrow mb-4 flex justify-center lg:justify-start">What&apos;s in the box</h3>}
              <ul className="overflow-hidden rounded-card bg-porcelain text-body-sm shadow-soft">
                {included.map((item) => (
                  <li
                    key={item.label}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-5 py-3 even:bg-cream/60"
                  >
                    <span>{item.label}</span>
                    <span className="text-ink-soft">{item.body}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Returns / guarantee / trust ────────────────────────────────────── */

export function TrustPoints({ points }: { points: ShopTrustPoint[] }) {
  if (points.length === 0) return null;
  return (
    <section className="py-12 lg:py-16" aria-labelledby="trust-heading">
      <div className="container-page">
        <SectionHeading
          eyebrow="Buy with confidence"
          title="Shop with peace of mind."
          id="trust-heading"
        />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((point) => (
            <li
              key={point.label}
              className="rounded-media bg-porcelain p-6 shadow-soft lg:p-7"
            >
              <span className="grid size-10 place-items-center rounded-control bg-sage-100 text-sage-600">
                <PdpIcon icon={point.icon} size={20} />
              </span>
              <h3 className="mt-5 font-serif text-heading-3">{point.label}</h3>
              <p className="mt-2 text-body-sm text-ink-soft">{point.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── FAQ ────────────────────────────────────────────────────────────── */

/**
 * FAQ as native <details> in soft stacked cards — answers live in the server
 * HTML (crawlable); keyboard and screen-reader support is built in.
 */
export function ProductFAQ({
  items,
  supportEmail,
}: {
  items: CatalogFaqItem[];
  supportEmail: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <section className="px-2 sm:px-3" aria-labelledby="faq">
      <div className="rounded-media bg-ivory py-12 lg:py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[4fr_8fr] lg:gap-16">
          <SectionHeading
            eyebrow="Questions"
            title="Before you buy."
            id="faq"
            intro={
              supportEmail && (
                <>
                  Didn&apos;t find your answer?{" "}
                  <a href={`mailto:${supportEmail}`} className="link-underline text-ink">
                    {supportEmail}
                  </a>
                </>
              )
            }
          />
          <div className="flex flex-col gap-2.5">
            {items.map((item) => (
              <details
                key={item.question}
                name="pdp-faq"
                className="group rounded-card bg-porcelain px-6 shadow-soft transition-shadow duration-300 open:shadow-float md:px-7"
              >
                <summary className="flex min-h-18 items-center justify-between gap-6 py-5">
                  <h3 className="text-body-lg font-medium">{item.question}</h3>
                  <span className="grid size-9 shrink-0 place-items-center rounded-tag bg-cream transition-colors group-open:bg-sage-600 group-open:text-ivory">
                    <Icon
                      name="plus"
                      className="size-4 transition-transform duration-300 group-open:rotate-45"
                    />
                  </span>
                </summary>
                <p className="max-w-[64ch] pb-7 text-ink-soft">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
