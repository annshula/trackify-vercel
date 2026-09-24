import type { CatalogProduct } from "@/types/catalog";
import { CheckIcon, MinusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils/cn";

/**
 * "This product vs. others" — a per-product feature comparison table set by
 * the merchant in Shopify admin (`custom.comparison_table`, a list of
 * `comparison_row` metaobjects: feature / us_value / others_value — see
 * lib/catalog/normalize.ts's `normalizeComparisonTable`).
 *
 * Hidden entirely when the merchant hasn't set any rows for this product —
 * never renders an invented comparison, same rule as Reviews.
 *
 * Desktop is a real 3-column table with a sticky header; phones stack each
 * row into feature → "This product" → "Others", since a 3-column table at
 * phone width crushes the value text unreadably.
 */
export function ComparisonTable({ product }: { product: CatalogProduct }) {
  const rows = product.comparisonTable;
  if (rows.length === 0) return null;

  return (
    <section
      id="comparison"
      aria-labelledby="comparison-heading"
      className="mt-14 scroll-mt-24"
    >
      <h2 id="comparison-heading" className="text-2xl">
        How {product.title} compares
      </h2>
      <p className="mt-1.5 text-sm text-ink-muted">
        Based on this product&apos;s own specs against commonly sold
        alternatives.
      </p>

      <div className="mt-5 overflow-hidden rounded-lg border border-line">
        {/* Column header — sm and up only; phones get inline labels per row instead. */}
        <div className="hidden grid-cols-[1.2fr_1fr_1fr] border-b border-line bg-surface sm:grid">
          <div className="p-4" />
          <div className="border-x border-line bg-accent-soft p-4 text-center text-sm font-semibold text-ink">
            {product.title}
          </div>
          <div className="p-4 text-center text-sm font-medium text-ink-muted">
            Others
          </div>
        </div>

        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li
              key={row.feature}
              className="p-4 sm:grid sm:grid-cols-[1.2fr_1fr_1fr] sm:items-stretch sm:p-0 odd:bg-surface/60"
            >
              <div className="text-sm font-medium text-ink sm:flex sm:items-center sm:p-4">
                {row.feature}
              </div>

              <div className="mt-2 flex items-start gap-2 sm:mt-0 sm:items-center sm:border-x sm:border-line sm:bg-accent-soft/40 sm:p-4">
                <CheckIcon
                  className="mt-0.5 size-4 shrink-0 text-accent sm:mt-0"
                  strokeWidth={2.5}
                />
                <span className="text-sm text-ink">
                  <span className="mr-1.5 text-2xs font-semibold tracking-wide text-accent uppercase sm:hidden">
                    This product:
                  </span>
                  {row.usValue}
                </span>
              </div>

              <div className="mt-1.5 flex items-start gap-2 text-ink-subtle sm:mt-0 sm:items-center sm:p-4">
                <MinusIcon className="mt-0.5 size-4 shrink-0 sm:mt-0" />
                <span className="text-sm">
                  <span className="mr-1.5 text-2xs font-semibold tracking-wide uppercase sm:hidden">
                    Others:
                  </span>
                  {row.othersValue}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className={cn("mt-3 text-xs text-ink-subtle")}>
        Comparison set by the merchant for this product — always check the
        listing for the exact item you&apos;re comparing.
      </p>
    </section>
  );
}
