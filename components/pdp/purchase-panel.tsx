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
  findVariantByOptions,
  lowStockCount,
  variantImageFor,
} from "@/lib/catalog/selectors";
import type { CatalogProduct } from "@/types/catalog";
import { PdpIcon } from "./pdp-icon";
import { usePurchase } from "./purchase-context";
import { AddToCartButton } from "./add-to-cart-button";

export type Reassurance = { icon: string | null; label: string };

/**
 * Matches a variant option that's really a pack-size/quantity choice
 * (e.g. this catalog's "Quantity" option with values "1PC"/"2PCS"/"3PCS") —
 * distinct from the generic numeric QuantityStepper below. When a product
 * already sells pack sizes as their own SKUs, the stepper would let a
 * shopper double up on "how many" in two different, disagreeing ways, so it's
 * hidden whenever this option is present.
 */
const QUANTITY_OPTION_NAME = /^(quantity|qty|pack)$/i;

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
    (option) =>
      option.values.length > 1 || option.values[0] !== "Default Title",
  );
  const price = variant?.price ?? product.priceRange.min;
  const compareAt = variant?.compareAtPrice ?? null;
  const saving = compareAt && compareAt > price ? compareAt - price : null;
  const lowStock = lowStockCount(variant);
  // Pack sizes are real SKUs here (see json-repository/normalize) rather than
  // a client-side quantity multiplier, so "how many" is fully answered by
  // picking one of these — the numeric stepper next to Add to cart would be a
  // second, disagreeing answer to the same question.
  const hasQuantityOption = options.some((option) =>
    QUANTITY_OPTION_NAME.test(option.name),
  );

  return (
    <div className="flex flex-col">
      {rating && rating.count > 0 && (
        <a
          href="#reviews"
          className="group inline-flex w-fit items-center gap-2 rounded-sm text-sm text-ink-muted"
        >
          <Rating value={rating.value} showValue={false} size={16} />
          <span className="tabular-nums">
            <span className="font-medium text-ink">
              {rating.value.toFixed(1)}
            </span>
            <span className="mx-1.5 text-ink-subtle">·</span>
            <span className="underline-offset-4 group-hover:underline">
              {rating.count} review{rating.count === 1 ? "" : "s"}
            </span>
          </span>
        </a>
      )}

      <h1
        className={cn(
          "mt-3 font-display leading-[1.2] tracking-tight text-balance",
          // A long, SEO-stuffed title (common on dropshipped catalogs) would
          // dominate the panel at the same size a short title uses — scale
          // down past ~60 characters so it still reads as a heading, not a
          // paragraph, while a normal title keeps its full display size.
          product.title.length > 90
            ? "text-xl"
            : product.title.length > 60
              ? "text-2xl"
              : "text-3xl",
        )}
      >
        {product.title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted text-pretty">
          {subtitle}
        </p>
      )}

      {perks.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2.5">
          {perks.map((perk) => (
            <li
              key={perk}
              className="flex items-start gap-3 text-sm text-ink-muted"
            >
              <span className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                <svg
                  viewBox="0 0 24 24"
                  className="size-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              {perk}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Price
          amount={price}
          compareAt={compareAt}
          currencyCode={product.priceRange.currencyCode}
          size="xl"
        />
        {saving && (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
            You save{" "}
            {formatMoney(saving, product.priceRange.currencyCode, {
              trimZeroCents: true,
            })}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-subtle">
        Taxes and shipping calculated at checkout.
      </p>

      <div className="mt-7 space-y-6">
        {options.map((option) => {
          const isQuantity = QUANTITY_OPTION_NAME.test(option.name);
          const isColor = OPTION_IS_COLOR.test(option.name);
          const available = availableValuesFor(product, option.name, selection);
          const chosen = selection[option.name];

          if (isQuantity) {
            return (
              <PackTilePicker
                key={option.id}
                option={option}
                chosen={chosen}
                available={available}
                product={product}
                selection={selection}
                onSelect={(value) => selectOption(option.name, value)}
              />
            );
          }

          return (
            <fieldset key={option.id}>
              <legend className="text-sm text-ink-muted">
                {option.name}:{" "}
                <span className="font-medium text-ink">{chosen}</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {option.values.map((value) => {
                  const inputId = `opt-${option.id}-${value}`.replace(
                    /[^a-zA-Z0-9-_]/g,
                    "-",
                  );
                  const selected = chosen === value;
                  const outOfStock = !available.has(value);
                  // The variant's own photo beats a guessed hex ("purple" is often lilac).
                  const photo = isColor
                    ? variantImageFor(product, option.name, value)
                    : null;
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
                          outOfStock &&
                            "text-ink-subtle line-through decoration-ink-subtle/60",
                          isColor && "pl-1.5",
                        )}
                      >
                        {isColor && (
                          <span
                            aria-hidden="true"
                            className="relative size-8 overflow-hidden rounded-full border border-line"
                            style={
                              swatch ? { backgroundColor: swatch } : undefined
                            }
                          >
                            {photo && (
                              <Image
                                src={photo.url}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            )}
                          </span>
                        )}
                        {value}
                        {outOfStock && (
                          <span className="sr-only">(sold out)</span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <div className="flex gap-3">
          {!hasQuantityOption && (
            <QuantityStepper
              value={quantity}
              max={maxQuantity}
              onChange={setQuantity}
              disabled={soldOut || unavailable}
            />
          )}
          <div className="min-w-0 flex-1" ref={setHeroCta}>
            <AddToCartButton size="lg" announce />
          </div>
          {!soldOut && !unavailable && (
            <button
              type="button"
              onClick={buyNow}
              disabled={buying}
              className="h-14 min-w-0 flex-1 cursor-pointer rounded-full border border-ink px-6 text-base font-medium text-ink transition duration-200 hover:bg-ink hover:text-ink-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
            >
              {buying ? "Taking you to checkout…" : "Buy it now"}
            </button>
          )}
        </div>

        <PaymentIcons />

        {error && (
          <p
            role="alert"
            className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger"
          >
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
            <span
              className="size-2 rounded-full bg-warning"
              aria-hidden="true"
            />
            Only {lowStock} left in {variant?.title}
          </p>
        )}
      </div>

      {reassurance.length > 0 && (
        <ul className="mt-7 divide-y divide-line rounded-lg border border-line bg-surface">
          {reassurance.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 px-4 py-3 text-sm text-ink-muted"
            >
              <PdpIcon
                icon={item.icon}
                size={20}
                className="shrink-0 text-accent"
              />
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

/**
 * Pack-size picker, styled as tiles rather than pills: each value is its own
 * real Shopify variant (SKU), so the tile shows that variant's own price and,
 * for anything past the smallest pack, its per-unit saving against buying
 * that many of the smallest pack individually — never a client-side
 * multiplier, since these SKUs already carry independently-set prices. The
 * middle value (typically the "sweet spot" pack) is flagged Most Popular.
 */
function PackTilePicker({
  option,
  chosen,
  available,
  product,
  selection,
  onSelect,
}: {
  option: CatalogProduct["options"][number];
  chosen: string | undefined;
  available: Set<string>;
  product: CatalogProduct;
  selection: Record<string, string>;
  onSelect: (value: string) => void;
}) {
  const baseVariant = findVariantByOptions(product, {
    ...selection,
    [option.name]: option.values[0]!,
  });
  const baseUnitPrice = baseVariant?.price ?? null;

  return (
    <fieldset>
      <legend className="text-sm text-ink-muted">{option.name}</legend>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {option.values.map((value, index) => {
          const tileVariant = findVariantByOptions(product, {
            ...selection,
            [option.name]: value,
          });
          const selected = chosen === value;
          const outOfStock = !available.has(value);
          const packCount = parseInt(value, 10) || index + 1;
          const savePercent =
            baseUnitPrice && tileVariant && packCount > 1
              ? Math.round(
                  (1 - tileVariant.price / (baseUnitPrice * packCount)) * 100,
                )
              : null;
          const inputId = `opt-${option.id}-${value}`.replace(
            /[^a-zA-Z0-9-_]/g,
            "-",
          );
          return (
            <div key={value} className="relative">
              {index === 1 && option.values.length >= 3 && (
                <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-ink-inverse uppercase">
                  Most popular
                </span>
              )}
              <input
                type="radio"
                id={inputId}
                name={`option-${option.id}`}
                value={value}
                checked={selected}
                onChange={() => onSelect(value)}
                className="peer sr-only"
              />
              <label
                htmlFor={inputId}
                title={outOfStock ? `${value} — sold out` : value}
                className={cn(
                  "flex h-full cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-center transition duration-200",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                  selected
                    ? "border-ink bg-surface-raised shadow-e1"
                    : "border-line hover:border-ink-subtle",
                  outOfStock && "text-ink-subtle opacity-60",
                )}
              >
                <span className="text-sm font-semibold text-ink">{value}</span>
                {tileVariant && (
                  <span className="text-xs tabular-nums text-ink-muted">
                    {formatMoney(tileVariant.price, tileVariant.currencyCode, {
                      trimZeroCents: true,
                    })}
                  </span>
                )}
                {savePercent !== null && savePercent > 0 && (
                  <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.65rem] font-semibold text-accent">
                    Save {savePercent}%
                  </span>
                )}
                {outOfStock && <span className="sr-only">(sold out)</span>}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Accepted-payment marks under the CTA row — the row itself is the "secure
 * checkout" reassurance, no separate copy needed. Inline SVGs, no external
 * logo files, so this never depends on an asset existing in public/.
 */
function PaymentIcons() {
  const methods: { name: string; mark: React.ReactNode }[] = [
    {
      name: "Visa",
      mark: (
        <svg viewBox="0 0 48 20" className="h-4 w-auto" aria-hidden="true">
          <text
            x="0"
            y="15"
            fontFamily="Arial, sans-serif"
            fontSize="14"
            fontWeight="700"
            fontStyle="italic"
            fill="#1A1F71"
          >
            VISA
          </text>
        </svg>
      ),
    },
    {
      name: "Mastercard",
      mark: (
        <svg viewBox="0 0 32 20" className="h-4 w-auto" aria-hidden="true">
          <circle cx="12" cy="10" r="7" fill="#EB001B" />
          <circle cx="20" cy="10" r="7" fill="#F79E1B" />
          <path d="M16 4.5a7 7 0 0 1 0 11 7 7 0 0 1 0-11z" fill="#FF5F00" />
        </svg>
      ),
    },
    {
      name: "PayPal",
      mark: (
        <svg viewBox="0 0 48 20" className="h-4 w-auto" aria-hidden="true">
          <text
            x="0"
            y="15"
            fontFamily="Arial, sans-serif"
            fontSize="13"
            fontWeight="700"
            fontStyle="italic"
            fill="#003087"
          >
            Pay<tspan fill="#009CDE">Pal</tspan>
          </text>
        </svg>
      ),
    },
    {
      name: "Apple Pay",
      mark: (
        <svg viewBox="0 0 48 20" className="h-4 w-auto" aria-hidden="true">
          <path
            d="M9.4 5.5c.5-.6.9-1.5.8-2.3-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.8 2.2.8.1 1.6-.4 2.1-1z"
            fill="currentColor"
          />
          <path
            d="M10.2 6.7c-1.1-.1-2.1.6-2.6.6-.5 0-1.4-.6-2.3-.6-1.2 0-2.3.7-2.9 1.8-1.2 2.2-.3 5.4.9 7.2.6.9 1.3 1.9 2.3 1.8 1-.1 1.3-.6 2.4-.6s1.4.6 2.4.6c1 0 1.6-.9 2.2-1.7.7-1 1-1.9 1-2 0 0-1.9-.7-1.9-2.9 0-1.9 1.5-2.7 1.6-2.8-.9-1.3-2.3-1.4-2.7-1.4z"
            fill="currentColor"
          />
          <text
            x="14"
            y="14"
            fontFamily="Arial, sans-serif"
            fontSize="9"
            fontWeight="600"
            fill="currentColor"
          >
            Pay
          </text>
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-ink-subtle">Pay with</span>
      <ul className="flex flex-wrap items-center gap-2">
        {methods.map((m) => (
          <li
            key={m.name}
            title={m.name}
            className="flex h-8 items-center justify-center rounded-md border border-line bg-surface px-2.5 text-ink"
          >
            {m.mark}
          </li>
        ))}
      </ul>
    </div>
  );
}
