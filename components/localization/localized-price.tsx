"use client";

import { Price, Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";
import { useLocalizedAmount } from "./localization-provider";

/**
 * Drop-in replacement for <Price> that overlays a live, Shopify-reported
 * price for the shopper's chosen country when one is available — same
 * skeleton-while-loading, no-flash-of-wrong-currency behavior as the PDP and
 * product cards, just packaged for the simpler list-of-products components
 * (wishlist, recently viewed, search) that don't otherwise need a hook.
 */
export function LocalizedPrice({
  variantId,
  amount,
  currencyCode,
  compareAt = null,
  size = "sm",
  className,
}: {
  variantId: string | null;
  amount: number;
  currencyCode: string;
  compareAt?: number | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const {
    amount: displayAmount,
    currencyCode: displayCurrency,
    compareAtAmount: displayCompareAt,
    loading,
  } = useLocalizedAmount(variantId, amount, currencyCode, compareAt);

  if (loading) return <Skeleton className={cn("h-5 w-16", className)} />;

  return (
    <Price
      amount={displayAmount}
      compareAt={displayCompareAt}
      currencyCode={displayCurrency}
      size={size}
      className={className}
    />
  );
}
