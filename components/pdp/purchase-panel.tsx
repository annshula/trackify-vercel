"use client";

import * as React from "react";
import { SmartImage as Image } from "@/components/ui/smart-image";
import { Price, Rating } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/lib/utils/money";
import {
  OPTION_IS_COLOR,
  availableValuesFor,
  colorSwatch,
  lowStockCount,
  variantImageFor,
} from "@/lib/catalog/selectors";
import { PdpIcon } from "./pdp-icon";
import { usePurchase } from "./purchase-context";
import { AddToCartButton } from "./add-to-cart-button";

export type Reassurance = { icon: string | null; label: string };

/**
 * The above-the-fold purchase column. Answers, top to bottom: is it any good
 * (rating) → what is it (title) → why do I want it (value prop) → what does it
 * cost → which one → buy → what happens after I buy.
 */
export function PurchasePanel({
  subtitle,
  perks,
  rating,
  reassurance,
}: {
  subtitle: string | null;
  /** Short benefit lines under the title — filled-tick list, 4-5 lines is the sweet spot. */
  perks: string[];
  rating: { value: number; count: number } | null;
  reassurance: Reassurance[];
}) {
  const {
    product,
    variant,
    selection,
    selectOption,
    quantity,
    setQuantity,
    maxQuantity,
    soldOut,
    unavailable,
    error,
    buying,
    buyNow,
    setHeroCta,
  } = usePurchase();

  const options = product.options.filter(
    (option) => option.values.length > 1 || option.values[0] !== "Default Title",
  );
  const price = variant?.price ?? product.priceRange.min;
  const compareAt = variant?.compareAtPrice ?? null;
  const saving = compareAt && compareAt > price ? compareAt - price : null;
  const lowStock = lowStockCount(variant);

  return (
    <div className="flex flex-col">
      {rating && rating.count > 0 && (
        <a
          href="#reviews"
          className="group inline-flex w-fit items-center gap-2 rounded-sm text-sm text-ink-muted"
        >
          <Rating value={rating.value} showValue={false} size={16} />
          <span className="tabular-nums">
            <span className="font-medium text-ink">{rating.value.toFixed(1)}</span>
            <span className="mx-1.5 text-ink-subtle">·</span>
            <span className="underline-offset-4 group-hover:underline">
              {rating.count} review{rating.count === 1 ? "" : "s"}
            </span>
          </span>
        </a>
      )}

      <h1 className="mt-3 font-display text-3xl leading-[1.1] tracking-tight text-balance">
        {product.title}
      </h1>
      {subtitle && <p className="mt-3 text-lg leading-relaxed text-ink-muted text-pretty">{subtitle}</p>}

      {perks.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2.5">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-3 text-sm text-ink-muted">
              <span className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              {perk}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Price amount={price} compareAt={compareAt} currencyCode={product.priceRange.currencyCode} size="xl" />
        {saving && (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
            You save {formatMoney(saving, product.priceRange.currencyCode, { trimZeroCents: true })}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-subtle">Taxes and shipping calculated at checkout.</p>

      <div className="mt-7 space-y-6">
        {options.map((option) => {
          const isColor = OPTION_IS_COLOR.test(option.name);
          const available = availableValuesFor(product, option.name, selection);
          const chosen = selection[option.name];
          return (
            <fieldset key={option.id}>
              <legend className="text-sm text-ink-muted">
                {option.name}: <span className="font-medium text-ink">{chosen}</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {option.values.map((value) => {
                  const inputId = `opt-${option.id}-${value}`.replace(/[^a-zA-Z0-9-_]/g, "-");
                  const selected = chosen === value;
                  const outOfStock = !available.has(value);
                  // The variant's own photo beats a guessed hex ("purple" is often lilac).
                  const photo = isColor ? variantImageFor(product, option.name, value) : null;
                  const swatch = isColor && !photo ? colorSwatch(value) : null;
                  return (
                    <div key={value}>
                      <input
                        type="radio"
                        id={inputId}
                        name={`option-${option.id}`}
                        value={value}
                        checked={selected}
                        onChange={() => selectOption(option.name, value)}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor={inputId}
                        title={outOfStock ? `${value} — sold out` : value}
                        className={cn(
                          "relative flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition duration-200",
                          "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                          selected
                            ? "border-ink bg-surface-raised text-ink shadow-e1"
                            : "border-line-strong text-ink-muted hover:border-ink-subtle",
                          outOfStock && "text-ink-subtle line-through decoration-ink-subtle/60",
                          isColor && "pl-1.5",
                        )}
                      >
                        {isColor && (
                          <span
                            aria-hidden="true"
                            className="relative size-8 overflow-hidden rounded-full border border-line"
                            style={swatch ? { backgroundColor: swatch } : undefined}
                          >
                            {photo && <Image src={photo.url} alt="" fill sizes="32px" className="object-cover" />}
                          </span>
                        )}
                        {value}
                        {outOfStock && <span className="sr-only">(sold out)</span>}
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="flex items-end gap-3">
          <QuantityStepper
            value={quantity}
            max={maxQuantity}
            onChange={setQuantity}
            disabled={soldOut || unavailable}
          />
          <div className="min-w-0 flex-1" ref={setHeroCta}>
            <AddToCartButton size="lg" announce />
          </div>
        </div>

        {!soldOut && !unavailable && (
          <button
            type="button"
            onClick={buyNow}
            disabled={buying}
            className="flex h-13 w-full cursor-pointer items-center justify-center rounded-full border border-ink text-base font-medium text-ink transition duration-200 hover:bg-ink hover:text-ink-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
          >
            {buying ? "Taking you to checkout…" : "Buy it now"}
          </button>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        {soldOut && (
          <p className="rounded-md bg-surface-sunken px-4 py-3 text-sm text-ink-muted">
            {variant?.title} is sold out right now.
            {options.length > 0 && " Another option may still be available."}
          </p>
        )}
        {lowStock !== null && (
          <p className="flex items-center gap-2 text-sm text-warning">
            <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
            Only {lowStock} left in {variant?.title}
          </p>
        )}
      </div>

      {reassurance.length > 0 && (
        <ul className="mt-7 divide-y divide-line rounded-lg border border-line bg-surface">
          {reassurance.map((item) => (
            <li key={item.label} className="flex items-center gap-3 px-4 py-3 text-sm text-ink-muted">
              <PdpIcon icon={item.icon} size={20} className="shrink-0 text-accent" />
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuantityStepper({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const button =
    "grid size-11 cursor-pointer place-items-center rounded-full text-lg text-ink transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <div>
      <label htmlFor="pdp-quantity" className="sr-only">
        Quantity
      </label>
      <div className="flex h-14 items-center rounded-full border border-line-strong px-1.5">
        <button
          type="button"
          className={button}
          onClick={() => onChange(value - 1)}
          disabled={disabled || value <= 1}
          aria-label="Decrease quantity"
        >
          −
        </button>
        <input
          id="pdp-quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-8 [appearance:textfield] bg-transparent text-center text-base tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          className={button}
          onClick={() => onChange(value + 1)}
          disabled={disabled || value >= max}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  );
}
