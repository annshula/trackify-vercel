import type { CatalogProduct } from "@/types/catalog";
import { SmartImage as Image } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils/cn";

/**
 * "This product vs. others" — a per-product comparison set by the merchant in
 * Shopify admin (`custom.comparison_table`, a list of `comparison_row`
 * metaobjects: feature / us_value / others_value — see
 * lib/catalog/normalize.ts's `normalizeComparisonTable`).
 *
 * Hidden entirely when the merchant hasn't set any rows — never renders an
 * invented comparison, same rule as Reviews.
 *
 * Desktop: a three-column table whose "This product" column is lifted onto
 * its own raised band, so the eye reads straight down the winning side.
 * Phones: each row stacks into feature → this product → others, since three
 * columns at phone width crush the text.
 */
export function ComparisonTable({ product }: { product: CatalogProduct }) {
  const rows = product.comparisonTable;
  if (rows.length === 0) return null;
  const thumb = product.images[0] ?? null;
  const last = rows.length - 1;

  return (
    <section
      id="comparison"
      aria-labelledby="comparison-heading"
      className="scroll-mt-24 py-20 lg:py-28"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="comparison-heading" className="text-3xl tracking-tight text-balance">
            How it compares
          </h2>
          <p className="mt-2 text-ink-muted">Side by side with the usual alternatives.</p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl" role="table" aria-label="Comparison with alternatives">
          {/* Column header — sm and up; phones label each cell inline instead. */}
          <div role="row" className="hidden grid-cols-[1.1fr_1.2fr_1fr] items-end sm:grid">
            <div role="columnheader" className="sr-only">
              Feature
            </div>
            <div
              role="columnheader"
              className="flex flex-col items-center gap-2 rounded-t-2xl border-x border-t border-ink/10 bg-surface-raised px-4 pt-5 pb-4"
            >
              {thumb && (
                <span className="relative size-14 overflow-hidden rounded-xl bg-surface-sunken">
                  <Image src={thumb.url} alt="" fill sizes="56px" className="object-cover" />
                </span>
              )}
              <span className="text-sm font-semibold text-ink">This product</span>
            </div>
            <div role="columnheader" className="pb-4 text-center text-sm font-medium text-ink-subtle">
              Others
            </div>
          </div>

          <div className="space-y-3 sm:space-y-0">
            {rows.map((row, index) => (
              <div
                key={row.feature}
                role="row"
                className="rounded-xl border border-line bg-surface p-4 sm:grid sm:grid-cols-[1.1fr_1.2fr_1fr] sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
              >
                <div
                  role="rowheader"
                  className={cn(
                    "text-sm font-semibold text-ink sm:flex sm:items-center sm:py-5 sm:pr-4",
                    index !== last && "sm:border-b sm:border-line",
                  )}
                >
                  {row.feature}
                </div>

                <div
                  role="cell"
                  className={cn(
                    "mt-3 flex items-start gap-3 sm:mt-0 sm:items-center sm:border-x sm:border-ink/10 sm:bg-surface-raised sm:px-5 sm:py-5",
                    index !== last && "sm:border-b sm:border-b-line",
                    index === last && "sm:rounded-b-2xl sm:border-b",
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success text-white" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span className="text-sm text-ink">
                    <span className="sr-only sm:hidden">This product: </span>
                    {row.usValue}
                  </span>
                </div>

                <div
                  role="cell"
                  className={cn(
                    "mt-2.5 flex items-start gap-3 sm:mt-0 sm:items-center sm:py-5 sm:pl-5",
                    index !== last && "sm:border-b sm:border-line",
                  )}
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-sunken text-ink-subtle" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </span>
                  <span className="text-sm text-ink-muted">
                    <span className="sr-only sm:hidden">Others: </span>
                    {row.othersValue}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
