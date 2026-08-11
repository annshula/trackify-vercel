"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Cart, CartLine } from "@/types/commerce";
import { useCart } from "./cart-provider";
import {
  applyDiscountCode,
  proceedToCheckout,
  removeCartLine,
  removeDiscountCode,
  updateCartLine,
} from "@/lib/cart/actions";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/form";
import { Alert, EmptyState, Price } from "@/components/ui/primitives";
import { AlertIcon, BagIcon, TrashIcon } from "@/components/ui/icons";
import { formatMoneyV2, moneyToNumber } from "@/lib/utils/money";
import { track } from "@/lib/analytics";

/**
 * Full cart page.
 *
 * Mirrors the drawer's behaviour with more room: line-level detail, discount
 * codes, and a summary that is sticky on desktop and pinned to the bottom on
 * mobile so the total and CTA are always reachable.
 */
export function CartPageClient({ initialCart }: { initialCart: Cart | null }) {
  const { cart: liveCart, run, quantityOf, isPending } = useCart();
  const [checkingOut, setCheckingOut] = React.useState(false);
  const [issues, setIssues] = React.useState<string[]>([]);

  // The provider already adopts the server-rendered cart; falling back to the
  // prop covers the first paint before any client mutation has happened.
  const cart = liveCart ?? initialCart;
  const lines = cart?.lines ?? [];

  const onCheckout = async () => {
    setCheckingOut(true);
    setIssues([]);
    track("begin_checkout", {
      currency: cart?.cost.totalAmount.currencyCode,
      value: moneyToNumber(cart?.cost.subtotalAmount),
    });

    const result = await run(() => proceedToCheckout());
    if (!result.ok) {
      setCheckingOut(false);
      if (result.issues?.length)
        setIssues(result.issues.map((issue) => issue.message));
    }
  };

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<BagIcon size={24} />}
        title="Your bag is empty"
        description="Once you add something, it will appear here and stay for 30 days."
        action={
          <ButtonLink href="/collections" size="lg">
            Start shopping
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
      <div>
        {issues.length > 0 && (
          <Alert
            tone="warning"
            title="Your bag changed"
            icon={<AlertIcon size={18} />}
            className="mb-6"
          >
            <ul className="mt-1 list-inside list-disc space-y-1">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <p className="mt-2">
              Review the changes above, then continue to checkout.
            </p>
          </Alert>
        )}

        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <CartPageLine
              key={line.id}
              line={line}
              quantity={quantityOf(line.id)}
              onQuantity={(quantity) =>
                run(() => updateCartLine({ lineId: line.id, quantity }), {
                  optimistic: { [line.id]: quantity },
                  silent: true,
                })
              }
              onRemove={() => {
                track("remove_from_cart", {
                  currency: line.cost.totalAmount.currencyCode,
                  value: moneyToNumber(line.cost.totalAmount),
                  items: [
                    {
                      item_id: line.merchandise.product.handle,
                      item_name: line.merchandise.product.title,
                      quantity: line.quantity,
                    },
                  ],
                });
                return run(() => removeCartLine({ lineId: line.id }), {
                  optimistic: { [line.id]: 0 },
                });
              }}
            />
          ))}
        </ul>

        <div className="mt-6">
          <ButtonLink href="/collections" variant="ghost">
            ← Continue shopping
          </ButtonLink>
        </div>
      </div>

      <aside
        aria-labelledby="summary-heading"
        className="lg:sticky lg:top-24 lg:self-start"
      >
        <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
          <h2 id="summary-heading" className="text-lg">
            Summary
          </h2>

          <DiscountForm cart={cart} />

          <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="tabular-nums">
                {formatMoneyV2(cart?.cost.subtotalAmount)}
              </dd>
            </div>

            {cart?.discountAllocations.map((allocation, index) => (
              <div
                key={`${allocation.code ?? allocation.title}-${index}`}
                className="flex justify-between text-success"
              >
                <dt>{allocation.code ?? allocation.title ?? "Discount"}</dt>
                <dd className="tabular-nums">
                  −{formatMoneyV2(allocation.discountedAmount)}
                </dd>
              </div>
            ))}

            <div className="flex justify-between">
              <dt className="text-ink-muted">Shipping</dt>
              <dd className="text-ink-subtle">Calculated at checkout</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Taxes</dt>
              <dd className="text-ink-subtle">Calculated at checkout</dd>
            </div>

            <div className="flex items-baseline justify-between border-t border-line pt-3.5 text-base">
              <dt className="font-medium">Total</dt>
              <dd className="text-xl font-medium tabular-nums">
                {formatMoneyV2(cart?.cost.totalAmount)}
              </dd>
            </div>
          </dl>

          <Button
            fullWidth
            size="lg"
            className="mt-5"
            onClick={onCheckout}
            loading={checkingOut}
            disabled={isPending && !checkingOut}
          >
            Checkout
          </Button>

          <p className="mt-3 text-center text-xs leading-relaxed text-ink-subtle">
            Shipping, taxes and any additional discounts are calculated by
            Shopify at checkout. Payment is processed securely by Shopify.
          </p>
        </div>
      </aside>
    </div>
  );
}

function CartPageLine({
  line,
  quantity,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  quantity: number;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const { merchandise } = line;
  const options = merchandise.selectedOptions.filter(
    (option) => option.value !== "Default Title",
  );

  const max =
    typeof merchandise.quantityAvailable === "number" &&
    merchandise.quantityAvailable > 0
      ? Math.min(merchandise.quantityAvailable, 99)
      : 99;

  return (
    <li
      className={
        quantity === 0 ? "opacity-40 transition-opacity" : "transition-opacity"
      }
    >
      <div className="flex gap-4 py-6 sm:gap-6">
        <Link
          href={`/products/${merchandise.product.handle}`}
          className="relative size-24 shrink-0 overflow-hidden rounded-md bg-surface-sunken sm:size-32"
        >
          {merchandise.image && (
            <Image
              src={merchandise.image.url}
              alt={merchandise.image.altText ?? merchandise.product.title}
              fill
              sizes="128px"
              className="object-cover"
            />
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {merchandise.product.vendor && (
                <p className="text-2xs font-medium tracking-[0.12em] text-ink-subtle uppercase">
                  {merchandise.product.vendor}
                </p>
              )}
              <Link
                href={`/products/${merchandise.product.handle}`}
                className="mt-0.5 block font-medium hover:underline underline-offset-4"
              >
                {merchandise.product.title}
              </Link>
              {options.length > 0 && (
                <dl className="mt-1 flex flex-wrap gap-x-3 text-sm text-ink-muted">
                  {options.map((option) => (
                    <div key={option.name} className="flex gap-1">
                      <dt>{option.name}:</dt>
                      <dd className="text-ink">{option.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {merchandise.sku && (
                <p className="mt-1 text-xs text-ink-subtle">
                  SKU {merchandise.sku}
                </p>
              )}
              {!merchandise.availableForSale && (
                <p className="mt-1.5 text-sm font-medium text-danger">
                  No longer available
                </p>
              )}
            </div>

            <Price
              amount={moneyToNumber(line.cost.amountPerQuantity)}
              compareAt={
                line.cost.compareAtAmountPerQuantity
                  ? moneyToNumber(line.cost.compareAtAmountPerQuantity)
                  : null
              }
              currencyCode={line.cost.amountPerQuantity.currencyCode}
              className="shrink-0 text-right"
            />
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="flex items-center gap-3">
              <QuantityStepper
                value={quantity}
                min={1}
                max={max}
                onChange={onQuantity}
                label={`Quantity of ${merchandise.product.title}`}
              />
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm text-ink-subtle transition-colors hover:text-danger"
              >
                <TrashIcon size={16} />
                Remove
                <span className="sr-only"> {merchandise.product.title}</span>
              </button>
            </div>

            <p className="text-sm">
              <span className="text-ink-muted">Line total </span>
              <span className="font-medium tabular-nums">
                {formatMoneyV2(line.cost.totalAmount)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

function DiscountForm({ cart }: { cart: Cart | null }) {
  const { run } = useCart();
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();

  const applied = cart?.discountCodes ?? [];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);

    const result = await run(() => applyDiscountCode({ code: code.trim() }), {
      silent: true,
    });
    setBusy(false);

    if (result.ok) setCode("");
    else setError(result.error ?? "That code could not be applied.");
  };

  return (
    <div className="mt-5">
      <form onSubmit={onSubmit} noValidate>
        <label htmlFor={inputId} className="block text-sm font-medium">
          Discount code
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={inputId}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            placeholder="Enter code"
            autoComplete="off"
            autoCapitalize="characters"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3.5 text-sm uppercase outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 aria-invalid:border-danger"
          />
          <Button
            type="submit"
            variant="secondary"
            loading={busy}
            disabled={!code.trim()}
          >
            Apply
          </Button>
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-xs font-medium text-danger"
          >
            {error}
          </p>
        )}
      </form>

      {applied.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {applied.map((discount) => (
            <li key={discount.code}>
              <button
                type="button"
                onClick={() =>
                  run(() => removeDiscountCode({ code: discount.code }), {
                    silent: true,
                  })
                }
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold uppercase transition-colors ${
                  discount.applicable
                    ? "bg-success-soft text-success hover:opacity-80"
                    : "bg-danger-soft text-danger hover:opacity-80"
                }`}
              >
                {discount.code}
                {!discount.applicable && (
                  <span className="normal-case">(not applicable)</span>
                )}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Remove discount code</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
