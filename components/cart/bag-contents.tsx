"use client";

import * as React from "react";
import Link from "next/link";
import { LoadingImage } from "@/components/pdp/loading-image";
import { Icon } from "@/components/pdp/icon";
import { PaymentIcons } from "@/components/pdp/payment-icons";
import { Stars } from "@/components/pdp/stars";
import { Skeleton } from "@/components/ui/primitives";
import { useLocalizedAmount } from "@/components/localization/localization-provider";
import type { CartUpsell } from "@/lib/cart/upsell";
import { track, toEcommerceItem } from "@/lib/analytics";
import { formatMoney } from "@/lib/utils/money";
import type { PaymentMethod } from "@/lib/shopify/payments";
import { cn } from "@/lib/utils/cn";
import { useCart, type ResolvedLine } from "./cart-provider";

/**
 * Bag body shared by the drawer and the /cart page: lines, an offer card, the
 * order summary and checkout. The bag is browser-side, so every change here is
 * instant; Shopify is only involved once Checkout is pressed.
 * `onNavigate` closes the drawer when a link is followed.
 */
export function BagContents({
  onNavigate,
  payments,
  upsells,
  delivery,
  freeShipping,
}: {
  onNavigate?: () => void;
  payments: PaymentMethod[];
  upsells: CartUpsell[];
  /** Store-wide delivery estimate, e.g. "5–11 days"; null shows a plain "Tracked delivery". */
  delivery: string | null;
  /** True only when the store's shipping note says shipping is free. */
  freeShipping: boolean;
}) {
  const { lines, subtotal, discount, currency, hydrated, setQuantity, remove, checkout } = useCart();
  const [pending, setPending] = React.useState(false);
  const [issues, setIssues] = React.useState<string[]>([]);
  const [summaryOpen, setSummaryOpen] = React.useState(false);

  if (!hydrated) {
    return <div className="flex-1 p-6 text-body-sm text-ink-soft">Loading your bag…</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-start gap-5 p-6">
        <p className="font-serif text-heading-2">Your bag is empty.</p>
        <p className="text-body-sm text-ink-soft">
          Browse the range, or check how delivery works first.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/collections" className="btn-primary" onClick={onNavigate}>
            Shop all
          </Link>
          <Link href="/pages/shipping" className="btn-quiet" onClick={onNavigate}>
            Delivery details
          </Link>
        </div>
      </div>
    );
  }

  const inBag = new Set(lines.map((line) => line.handle));
  const upsell = upsells.find((offer) => !inBag.has(offer.handle)) ?? null;
  const hasDiscount = discount > 0.009;

  const onCheckout = async () => {
    setPending(true);
    setIssues([]);
    const result = await checkout();
    if (!result.ok) {
      setIssues(result.issues?.length ? result.issues : [result.error]);
      setPending(false);
    }
  };

  return (
    <>
      <ul
        className="flex flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-3 py-2"
        aria-label="Items in your bag"
      >
        {lines.map((line) => (
          <BagLine
            key={line.variantId}
            line={line}
            currency={currency}
            onNavigate={onNavigate}
            onQuantity={(quantity) => setQuantity(line.variantId, quantity)}
            onRemove={() => remove(line.variantId)}
          />
        ))}

        {upsell && <UpsellCard upsell={upsell} />}
      </ul>

      <div
        className={cn(
          "m-3 mt-3 rounded-card bg-porcelain px-4 shadow-float",
          summaryOpen
            ? "pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            : "pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        {/* Short summary above the button; the full breakdown opens on click. */}
        {!summaryOpen && (
          <button
            type="button"
            className="flex w-full items-center gap-3 text-left"
            aria-expanded={false}
            aria-controls="bag-summary"
            onClick={() => setSummaryOpen(true)}
          >
            <TruckBadge size="sm" />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block text-[0.8125rem] font-semibold">
                {freeShipping ? "Free shipping" : delivery ? `Delivery in ${delivery}` : "Tracked delivery"}
              </span>
              <span className="mt-1 block text-[0.72rem] text-ink-soft">
                {hasDiscount
                  ? `You save ${formatMoney(discount, currency)}`
                  : delivery
                    ? `Delivery in ${delivery}`
                    : freeShipping
                      ? "Tracked delivery"
                      : "Shipping calculated at checkout"}
              </span>
            </span>
            <span className="font-numeral text-[0.95rem] font-semibold tabular-nums">
              {formatMoney(subtotal, currency)}
            </span>
            <Icon name="chevron-down" className="size-4 shrink-0 text-ink-soft" />
            <span className="sr-only">Show order summary</span>
          </button>
        )}

        {summaryOpen && (
          <div id="bag-summary">
            <div className="flex items-center gap-3">
              <TruckBadge size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-semibold">
                  {freeShipping ? "Free shipping" : delivery ? `Delivery in ${delivery}` : "Tracked delivery"}
                </p>
                <p className="text-[0.72rem] leading-snug text-ink-soft">
                  {freeShipping
                    ? `Tracked delivery on every order${delivery ? `, in ${delivery}` : ""}.`
                    : "Every order is tracked. Shipping is calculated at checkout."}
                </p>
              </div>
              {freeShipping && (
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-numeral text-[0.8125rem] font-semibold text-sage-600">FREE</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sage-600 py-0.5 pr-2 pl-1.5 text-[0.68rem] leading-none font-semibold text-ivory">
                    <Icon name="check" className="size-3" strokeWidth={3} />
                    Added
                  </span>
                </div>
              )}
            </div>

            <dl className="mt-3 space-y-1.5 border-t border-sand pt-3 text-[0.8125rem]">
              {hasDiscount && (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-soft">Subtotal</dt>
                    <dd className="font-numeral tabular-nums text-ink-soft">
                      {formatMoney(subtotal + discount, currency)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex flex-wrap items-center gap-1.5 text-ink-soft">
                      Savings
                      <span className="font-numeral text-[0.7rem] font-semibold text-clay-600 tabular-nums">
                        {Math.round((discount / (subtotal + discount)) * 100)}% off
                      </span>
                    </dt>
                    <dd className="font-numeral tabular-nums text-clay-600">
                      −{formatMoney(discount, currency)}
                    </dd>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between border-t border-dashed border-sand pt-2 text-[0.95rem]">
                <dt className="font-semibold">Total</dt>
                <dd className="font-numeral font-semibold tabular-nums">
                  {formatMoney(subtotal, currency)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[0.72rem] text-ink-soft">
              Taxes and discount codes are applied at checkout.
            </p>

            <button
              type="button"
              className="mx-auto mt-2 flex items-center gap-1 text-[0.72rem] font-medium text-ink-soft hover:text-ink"
              aria-expanded
              aria-controls="bag-summary"
              onClick={() => setSummaryOpen(false)}
            >
              Hide details
              <Icon name="chevron-down" className="size-3.5 rotate-180" />
            </button>
          </div>
        )}

        {issues.length > 0 && (
          <ul role="alert" className="mt-3 space-y-1 text-[0.8125rem] text-error">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn-primary mt-3 w-full"
          onClick={onCheckout}
          disabled={pending}
        >
          {pending
            ? "Opening secure checkout…"
            : `Checkout • ${formatMoney(subtotal, currency)}`}
        </button>
        <PaymentIcons methods={payments} className="mt-2" />
      </div>
    </>
  );
}

/** Truck on a sage tile with a small green tick — the delivery marker used in the bag footer. */
function TruckBadge({ size }: { size: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid shrink-0 place-items-center bg-sage-100 text-sage-600",
        size === "sm" ? "size-8 rounded-lg" : "size-9 rounded-xl",
      )}
    >
      <Icon name="truck" className={size === "sm" ? "size-4.5" : "size-5"} />
      <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full border-2 border-porcelain bg-success text-white">
        <Icon name="check" className="size-2.5" strokeWidth={3} />
      </span>
    </span>
  );
}

function BagLine({
  line,
  currency,
  onQuantity,
  onRemove,
  onNavigate,
}: {
  line: ResolvedLine;
  currency: string;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  onNavigate?: () => void;
}) {
  const hasSaving = line.savedPercent !== null;

  const removeButton = (
    <button
      type="button"
      onClick={onRemove}
      className="ml-auto grid size-7 shrink-0 place-items-center rounded-tag text-ink-soft hover:bg-sand hover:text-ink"
    >
      <Icon name="trash" className="size-4" />
      <span className="sr-only">Remove {line.productName}</span>
    </button>
  );

  return (
    <li className="flex gap-3 rounded-card bg-porcelain p-2.5 shadow-soft">
      <Link
        href={line.href}
        onClick={onNavigate}
        className="relative size-16 shrink-0 overflow-hidden rounded-xl"
        tabIndex={-1}
        aria-hidden="true"
      >
        {line.image && (
          <LoadingImage
            src={line.image}
            alt=""
            sizes="64px"
            spinnerClassName="size-4"
            className="object-contain"
          />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={line.href}
              onClick={onNavigate}
              title={line.productName}
              className="block truncate text-[0.8125rem] leading-snug font-medium hover:underline"
            >
              {line.productName}
            </Link>
            {!hasSaving && line.variantLabel && (
              <p className="text-[0.72rem] text-ink-soft">{line.variantLabel}</p>
            )}
          </div>
          <p className="flex shrink-0 flex-col items-end font-numeral tabular-nums">
            <span className="text-[0.8125rem] font-medium">{formatMoney(line.lineTotal, currency)}</span>
          </p>
        </div>

        {hasSaving && (
          <div className="flex items-center justify-between gap-2 text-[0.72rem]">
            <p className="flex min-w-0 items-center gap-1.5">
              {line.variantLabel && <span className="font-medium text-ink">{line.variantLabel}</span>}
              <span className="rounded-tag bg-clay-100 px-1.5 py-0.5 font-numeral text-[0.7rem] leading-none font-medium text-clay-600 tabular-nums">
                Saved {line.savedPercent}%
              </span>
            </p>
            <span className="shrink-0 font-numeral text-[0.7rem] text-ink-faint tabular-nums line-through">
              {formatMoney(line.compareAtTotal, currency)}
            </span>
          </div>
        )}

        {!line.available && (
          <p className="mt-0.5 text-[0.72rem] font-medium text-error">No longer available</p>
        )}

        <div className="mt-auto flex items-center justify-between pt-1.5">
          {/* Pack sizes are chosen on the product page, so those lines have no stepper. */}
          {line.hasPackOption ? null : (
            <div
              className="flex items-center rounded-tag bg-cream"
              role="group"
              aria-label={`Quantity for ${line.productName}`}
            >
              <button
                type="button"
                className="grid size-8 place-items-center rounded-tag hover:bg-sand"
                aria-label="Decrease quantity"
                onClick={() => onQuantity(line.quantity - 1)}
              >
                <Icon name="minus" className="size-3.5" />
              </button>
              <span className="w-6 text-center text-[0.8125rem] tabular-nums" aria-live="polite">
                {line.quantity}
              </span>
              <button
                type="button"
                className="grid size-8 place-items-center rounded-tag hover:bg-sand disabled:opacity-40"
                aria-label="Increase quantity"
                disabled={line.quantity >= line.maxQuantity}
                onClick={() => onQuantity(line.quantity + 1)}
              >
                <Icon name="plus" className="size-3.5" />
              </button>
            </div>
          )}
          {removeButton}
        </div>
      </div>
    </li>
  );
}

/** "Add to your order": one in-stock product offered beside the bag. */
function UpsellCard({ upsell }: { upsell: CartUpsell }) {
  const { add } = useCart();
  const { amount, currencyCode, compareAtAmount, loading } = useLocalizedAmount(
    upsell.variantId,
    upsell.price,
    upsell.currencyCode,
    upsell.compareAt,
  );
  const compareAt = compareAtAmount !== null && compareAtAmount > amount ? compareAtAmount : null;
  const rating = upsell.rating;

  const onAdd = () => {
    add(upsell.variantId, 1);
    track("add_to_cart", {
      currency: upsell.currencyCode,
      value: upsell.price,
      items: [
        toEcommerceItem(
          { id: upsell.productId, handle: upsell.handle, title: upsell.title },
          { quantity: 1, price: upsell.price },
        ),
      ],
    });
  };

  return (
    <li className="rounded-card border border-dashed border-sage-300 bg-sage-50 p-3">
      <p className="font-ui text-[0.68rem] font-semibold tracking-[0.08em] text-sage-800 uppercase">
        Add to your order
      </p>
      <div className="mt-2 flex gap-3">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-xl">
          {upsell.image && (
            <LoadingImage
              src={upsell.image}
              alt=""
              sizes="64px"
              spinnerClassName="size-4"
              className="object-contain"
            />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            {/* Title, rating, description and button stack in one column, so
                the description sits right under the title whatever the height
                of the price beside them. */}
            <div className="min-w-0 flex-1">
              <p className="text-[0.8125rem] leading-snug font-medium">{upsell.title}</p>
              {rating && rating.count > 0 && (
                <p
                  className="mt-1 flex items-center gap-1.5"
                  aria-label={`Rated ${rating.value.toFixed(1)} out of 5 from ${rating.count.toLocaleString("en-US")} reviews`}
                >
                  <Stars value={rating.value} starClassName="size-3.5" />
                  <span className="font-numeral text-[0.72rem] font-semibold tabular-nums">
                    {rating.value.toFixed(1)}
                  </span>
                  <span className="font-numeral text-[0.72rem] text-ink-soft tabular-nums">
                    ({rating.count.toLocaleString("en-US")})
                  </span>
                </p>
              )}
              {upsell.blurb && (
                <p className="mt-1 text-[0.72rem] leading-snug text-ink-soft">{upsell.blurb}</p>
              )}
              <button
                type="button"
                className="btn-primary mt-2.5 min-h-10 self-start px-4 text-[0.75rem]"
                onClick={onAdd}
              >
                Add to order
              </button>
            </div>
            {loading ? (
              <Skeleton className="h-5 w-14 shrink-0" />
            ) : (
              <p className="flex shrink-0 flex-col items-end font-numeral tabular-nums">
                <span className="text-[0.8125rem] font-medium">
                  {formatMoney(amount, currencyCode)}
                </span>
                {compareAt !== null && (
                  <span className="text-[0.7rem] text-ink-faint line-through">
                    {formatMoney(compareAt, currencyCode)}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
