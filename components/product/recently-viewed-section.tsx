"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { useDragScroll } from "@/hooks/use-drag-scroll";
import { formatMoney } from "@/lib/utils/money";
import { Skeleton } from "@/components/ui/primitives";
import { useLocalization } from "@/components/localization/localization-provider";

type MiniProduct = {
  handle: string;
  title: string;
  price: number;
  currencyCode: string;
  variantId: string | null;
  image: { url: string; altText: string | null } | null;
};

/**
 * Recently viewed.
 *
 * Handles live in localStorage; the product data is resolved through the local
 * catalog endpoint. Renders nothing at all until there is something to show,
 * so it never occupies space or shifts layout on a first visit.
 */
export function RecentlyViewedSection({
  excludeHandle,
}: {
  excludeHandle?: string;
}) {
  const { handles, hydrated } = useRecentlyViewed();
  const railRef = useDragScroll<HTMLUListElement>();
  const [products, setProducts] = React.useState<MiniProduct[] | null>(null);
  const { ready, localizedPriceFor, isPriceLoading, requestPrices } = useLocalization();

  const wanted = React.useMemo(
    () => handles.filter((handle) => handle !== excludeHandle).slice(0, 6),
    [handles, excludeHandle],
  );

  React.useEffect(() => {
    if (!hydrated || wanted.length === 0) return;

    const controller = new AbortController();
    fetch(`/api/products?handles=${encodeURIComponent(wanted.join(","))}`, {
      signal: controller.signal,
    })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("failed")),
      )
      .then((data: { products: MiniProduct[] }) => setProducts(data.products))
      .catch((error) => {
        // An aborted request is a superseded one, not a failure to report.
        if ((error as Error).name !== "AbortError") setProducts([]);
      });

    return () => controller.abort();
  }, [hydrated, wanted]);

  React.useEffect(() => {
    if (!products) return;
    const variantIds = products
      .map((product) => product.variantId)
      .filter((id): id is string => Boolean(id));
    requestPrices(variantIds);
  }, [products, requestPrices]);

  // Nothing to show and nothing to fetch — render no section at all rather
  // than reserving space that will stay empty.
  if (!hydrated || wanted.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="mt-20">
      <h2 id="recently-viewed-heading" className="text-xl">
        Recently viewed
      </h2>

      <ul
        ref={railRef}
        className="hide-scrollbar mt-5 flex snap-x gap-4 overflow-x-auto pb-2 lg:cursor-grab"
      >
        {products === null
          ? wanted.map((handle) => (
              <li key={handle} className="w-36 shrink-0 snap-start sm:w-44">
                <Skeleton className="aspect-4/5 w-full rounded-md" />
                <Skeleton className="mt-2.5 h-3.5 w-3/4" />
                <Skeleton className="mt-1.5 h-3 w-1/3" />
              </li>
            ))
          : products.map((product) => {
              const live = product.variantId ? localizedPriceFor(product.variantId) : null;
              // Before /api/localization resolves, a saved currency choice
              // is still unknown — treat that as loading too, not "none".
              const loading = product.variantId
                ? !ready || isPriceLoading(product.variantId)
                : false;
              const displayAmount = live ? Number.parseFloat(live.amount) : product.price;
              const displayCurrency = live?.currencyCode ?? product.currencyCode;

              return (
                <li
                  key={product.handle}
                  className="w-36 shrink-0 snap-start sm:w-44"
                >
                  <Link
                    href={`/products/${product.handle}`}
                    className="group block"
                  >
                    <span className="relative block aspect-4/5 overflow-hidden rounded-md bg-surface-sunken">
                      {product.image && (
                        <Image
                          src={product.image.url}
                          alt={product.image.altText ?? product.title}
                          fill
                          sizes="(min-width: 640px) 176px, 144px"
                          className="object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
                        />
                      )}
                    </span>
                    <span className="mt-2.5 block truncate text-sm font-medium group-hover:underline underline-offset-4">
                      {product.title}
                    </span>
                    {loading ? (
                      <Skeleton className="mt-1 h-3.5 w-12" />
                    ) : (
                      <span className="mt-0.5 block text-sm tabular-nums text-ink-muted">
                        {formatMoney(displayAmount, displayCurrency, {
                          trimZeroCents: true,
                        })}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
      </ul>
    </section>
  );
}
