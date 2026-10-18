"use client";

import * as React from "react";
import { LoadingImage } from "./loading-image";
import { Skeleton } from "@/components/ui/primitives";
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
import type { CatalogImage, CatalogProduct, CatalogVariant } from "@/types/catalog";
import { useLocalizedAmount } from "@/components/localization/localization-provider";
import { Icon } from "./icon";
import type { PaymentMethod } from "@/lib/shopify/payments";
import { PaymentIcons } from "./payment-icons";
import { SaleCountdown } from "./sale-countdown";
import { AddToCartButton } from "./add-to-cart-button";
import { usePurchase } from "./purchase-context";

type ProductOption = CatalogProduct["options"][number];

/**
 * Matches a variant option that's really a pack-size/quantity choice (e.g. a
 * "Quantity" option with values "1PC"/"2PCS"/"3PCS"). When a product already
 * sells pack sizes as their own SKUs, the numeric stepper would be a second,
 * disagreeing answer to "how many", so it is hidden whenever this option exists.
 */
const QUANTITY_OPTION_NAME = /^(quantity|qty|pack)$/i;

/**
 * The buying controls — the purchase column's client island. Pack options as photo cards, other options as soft option cards, a
 * single primary button, then the payment marks. Title, rating, perks and the
 * reference accordion are server-rendered by the page around it.
 */
export function PurchasePanel({
  saleEndsAt,
  freeShipping,
  payments,
}: {
  /** ISO datetime a live sale ends at (custom.sale_ends_at); null shows nothing. */
  saleEndsAt: string | null;
  /** True only when the store's shipping note actually says shipping is free. */
  freeShipping: boolean;
  /** Methods checkout accepts, for the logo row under the button. */
  payments: PaymentMethod[];
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
    setHeroCta,
  } = usePurchase();

  const options = product.options.filter(
    (option) => option.values.length > 1 || option.values[0] !== "Default Title",
  );
  const hasQuantityOption = options.some((option) => QUANTITY_OPTION_NAME.test(option.name));
  const lowStock = lowStockCount(variant);

  return (
    <div>
      {options.length > 0 && (
        <div className="space-y-7">
          {options.map((option) => {
            const available = availableValuesFor(product, option.name, selection);
            const chosen = selection[option.name];
            const onSelect = (value: string) => selectOption(option.name, value);

            if (QUANTITY_OPTION_NAME.test(option.name)) {
              return (
                <PackCards
                  key={option.id}
                  option={option}
                  chosen={chosen}
                  available={available}
                  product={product}
                  selection={selection}
                  onSelect={onSelect}
                />
              );
            }

            // A style whose values each have their own photo is picked by
            // picture; colours and plain text options stay a compact card row.
            const photos = option.values.map((value) =>
              variantImageFor(product, option.name, value),
            );
            const distinctPhotos = new Set(
              photos.filter(Boolean).map((image) => image!.url),
            ).size;
            if (!OPTION_IS_COLOR.test(option.name) && distinctPhotos === option.values.length) {
              return (
                <ImageOptionPicker
                  key={option.id}
                  option={option}
                  chosen={chosen}
                  available={available}
                  photos={photos as CatalogImage[]}
                  onSelect={onSelect}
                />
              );
            }

            return (
              <OptionCardPicker
                key={option.id}
                option={option}
                chosen={chosen}
                available={available}
                product={product}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      )}

      <div className={options.length > 0 ? "mt-9" : undefined}>
        {/* Pack cards carry their own prices; every other product needs the price here. */}
        {!hasQuantityOption && <PriceLine />}

        {(freeShipping || saleEndsAt) && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-x-3 gap-y-2",
              !hasQuantityOption && "mt-4",
            )}
          >
            {freeShipping && <FreeDeliveryUnlocked />}
            <SaleCountdown endsAt={saleEndsAt} variant="inline" />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3">
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
              <AddToCartButton size="lg" showPrice={false} announce />
            </div>
          </div>
        </div>

        <PaymentIcons methods={payments} className="mt-3" />


        <div className="mt-3 space-y-3 empty:hidden">
          {error && (
            <p role="alert" className="rounded-card bg-clay-100 px-4 py-3 text-body-sm text-error">
              {error}
            </p>
          )}
          {soldOut && (
            <p className="rounded-card bg-cream px-4 py-3 text-body-sm text-ink-soft">
              {variant?.title} is sold out right now.
              {options.length > 0 && " Another option may still be available."}
            </p>
          )}
          {lowStock !== null && (
            <p className="flex items-center gap-2 text-body-sm text-warning">
              <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
              Only {lowStock} left in {variant?.title}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Price (products with no pack option) ──────────────────────────────── */

function PriceLine() {
  const { product, variant } = usePurchase();
  const price = variant?.price ?? product.priceRange.min;
  const compareAt = variant?.compareAtPrice ?? null;
  // Same live, Shopify-reported localization as list views, so the PDP never
  // flashes the store's base currency before the visitor's own.
  const {
    amount,
    currencyCode,
    compareAtAmount,
    loading,
  } = useLocalizedAmount(variant?.id ?? null, price, product.priceRange.currencyCode, compareAt);

  if (loading) return <Skeleton className="h-9 w-40" />;

  const compareAtPrice = compareAtAmount !== null && compareAtAmount > amount ? compareAtAmount : null;
  const percent = compareAtPrice ? Math.round((1 - amount / compareAtPrice) * 100) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {compareAtPrice !== null && (
        <p className="font-numeral text-body-lg text-ink-soft tabular-nums line-through">
          {formatMoney(compareAtPrice, currencyCode, { trimZeroCents: true })}
        </p>
      )}
      <p className="font-numeral text-heading-2 font-semibold tabular-nums" aria-live="polite">
        {formatMoney(amount, currencyCode, { trimZeroCents: true })}
      </p>
      {percent !== null && percent > 0 && (
        <p className="inline-flex items-center rounded-tag bg-clay-600 px-2.5 py-1 font-numeral text-[0.8rem] leading-none font-bold tracking-wide text-ivory tabular-nums">
          −{percent}% OFF
        </p>
      )}
    </div>
  );
}

/* ── Option pickers ────────────────────────────────────────────────────── */

const optionInputId = (option: ProductOption, value: string) =>
  `opt-${option.id}-${value}`.replace(/[^a-zA-Z0-9-_]/g, "-");

function OptionLegend({ name, chosen }: { name: string; chosen: string | undefined }) {
  return (
    <legend className="mb-3 flex w-full items-baseline justify-between text-body-sm font-semibold">
      {name}
      <span className="font-normal text-ink-soft">{chosen}</span>
    </legend>
  );
}

/** Style picker by photo — each value is a card showing what that style actually contains. */
function ImageOptionPicker({
  option,
  chosen,
  available,
  photos,
  onSelect,
}: {
  option: ProductOption;
  chosen: string | undefined;
  available: Set<string>;
  photos: CatalogImage[];
  onSelect: (value: string) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <OptionLegend name={option.name} chosen={chosen} />
      <div className="grid grid-cols-3 gap-2.5">
        {option.values.map((value, index) => {
          const selected = chosen === value;
          const outOfStock = !available.has(value);
          return (
            <label
              key={value}
              data-checked={selected}
              title={outOfStock ? `${value} — sold out` : value}
              className="option-card flex cursor-pointer flex-col overflow-hidden has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sage-600"
            >
              <input
                type="radio"
                id={optionInputId(option, value)}
                name={`option-${option.id}`}
                value={value}
                checked={selected}
                onChange={() => onSelect(value)}
                className="sr-only"
              />
              <span className="relative block h-24 sm:h-28">
                <LoadingImage
                  src={photos[index]!.url}
                  alt=""
                  sizes="(min-width: 1024px) 10rem, 30vw"
                  className={cn(
                    "object-contain p-1.5",
                    outOfStock && "opacity-40 grayscale",
                  )}
                />
                {selected && (
                  <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-ink text-ivory">
                    <Icon name="check" className="size-3" />
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "px-2 py-2 text-center text-[0.8rem] leading-tight sm:text-body-sm",
                  selected ? "font-medium text-ink" : "text-ink-soft",
                )}
              >
                {value}
                {outOfStock && <span className="block text-[0.7rem] text-ink-faint">Sold out</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Colour swatches and plain text options as soft option cards. */
function OptionCardPicker({
  option,
  chosen,
  available,
  product,
  onSelect,
}: {
  option: ProductOption;
  chosen: string | undefined;
  available: Set<string>;
  product: CatalogProduct;
  onSelect: (value: string) => void;
}) {
  const isColor = OPTION_IS_COLOR.test(option.name);
  return (
    <fieldset className="min-w-0">
      <OptionLegend name={option.name} chosen={chosen} />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {option.values.map((value) => {
          const selected = chosen === value;
          const outOfStock = !available.has(value);
          // The variant's own photo beats a guessed hex ("purple" is often lilac).
          const photo = isColor ? variantImageFor(product, option.name, value) : null;
          const swatch = isColor && !photo ? colorSwatch(value) : null;
          return (
            <label
              key={value}
              data-checked={selected}
              data-disabled={outOfStock}
              title={outOfStock ? `${value} — sold out` : value}
              className={cn(
                "option-card flex min-h-14 cursor-pointer items-center gap-2.5 px-3 py-2.5 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sage-600",
                isColor && "pl-2",
              )}
            >
              <input
                type="radio"
                id={optionInputId(option, value)}
                name={`option-${option.id}`}
                value={value}
                checked={selected}
                onChange={() => onSelect(value)}
                className="sr-only"
              />
              {isColor && (
                <span
                  aria-hidden="true"
                  className="relative size-8 shrink-0 overflow-hidden rounded-full bg-cream shadow-[inset_0_0_0_1px_rgb(58_42_24/0.12)]"
                  style={swatch ? { backgroundColor: swatch } : undefined}
                >
                  {photo && (
                    <LoadingImage
                      src={photo.url}
                      alt=""
                      sizes="32px"
                      spinnerClassName="size-4"
                      className="object-cover"
                    />
                  )}
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-body-sm leading-tight font-medium">{value}</span>
                {outOfStock && (
                  <span className="block text-[0.7rem] text-ink-soft">Sold out</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/* ── Pack cards ────────────────────────────────────────────────────────── */

type PackRow = {
  value: string;
  count: number;
  label: string;
  variant: CatalogVariant | null;
};

/**
 * "Choose your pack" as photo cards — one card per pack size, each
 * with its own photo, price, per-pack price and saving. Phones get a stacked,
 * thumb-first row per card; from sm up the cards sit side by side. Every number
 * comes from that pack's own Shopify variant, never a client-side multiplier.
 *
 * The "Most popular" tag goes on the 3-pack (else the middle pack of three or
 * more); "Best value" on whichever other in-stock pack has the lowest real
 * per-unit price. Both are computed from the variants themselves.
 */
function PackCards({
  option,
  chosen,
  available,
  product,
  selection,
  onSelect,
}: {
  option: ProductOption;
  chosen: string | undefined;
  available: Set<string>;
  product: CatalogProduct;
  selection: Record<string, string>;
  onSelect: (value: string) => void;
}) {
  const rows: PackRow[] = option.values
    .map((value, index) => {
      const parsed = parseInt(value, 10);
      const count = parsed > 0 ? parsed : index + 1;
      return {
        value,
        count,
        label: parsed > 0 ? `${count} Pack` : value,
        variant: findVariantByOptions(product, { ...selection, [option.name]: value }),
      };
    })
    .sort((a, b) => a.count - b.count);

  const popularValue =
    rows.find((r) => r.count === 3 && r.variant)?.value ??
    (rows.length >= 3 ? rows[Math.floor(rows.length / 2)]!.value : null);

  const bestValueValue = (() => {
    let best: { value: string; perUnit: number } | null = null;
    for (const row of rows) {
      if (!row.variant || !available.has(row.value) || row.count <= 1) continue;
      const perUnit = row.variant.price / row.count;
      if (!best || perUnit < best.perUnit) best = { value: row.value, perUnit };
    }
    return best && best.value !== popularValue ? best.value : null;
  })();

  const photoOf = (row: PackRow): CatalogImage | null =>
    (row.variant?.imageId && product.images.find((img) => img.id === row.variant!.imageId)) ||
    product.images[0] ||
    null;
  // When every pack shares one photo, a bigger pack shows that shot once per
  // unit, fanned out — so the card still says "2" or "3" at a glance without
  // inventing imagery.
  const sharedPhoto = rows.every((r) => photoOf(r)?.url === photoOf(rows[0]!)?.url);

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-body font-semibold">Choose your pack</legend>
      <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-3 sm:gap-3 sm:pt-0">
        {rows.map((row) => (
          <PackCard
            key={row.value}
            option={option}
            row={row}
            photo={photoOf(row)}
            fan={sharedPhoto}
            selected={chosen === row.value}
            soldOut={!available.has(row.value) || !row.variant}
            tag={
              row.value === popularValue
                ? "Most popular"
                : row.value === bestValueValue
                  ? "Best value"
                  : null
            }
            featured={row.value === popularValue}
            fallbackCurrencyCode={product.priceRange.currencyCode}
            onSelect={onSelect}
          />
        ))}
      </div>
    </fieldset>
  );
}

function PackPhoto({
  src,
  units,
  fan,
  sizes,
}: {
  src: string;
  units: number;
  fan: boolean;
  sizes: string;
}) {
  const count = fan ? Math.min(Math.max(units, 1), 3) : 1;
  if (count === 1) {
    return (
      <LoadingImage
        src={src}
        alt=""
        sizes={sizes}
        spinnerClassName="size-5"
        className="object-contain"
      />
    );
  }
  const step = count === 2 ? 26 : 16;
  const width = 100 - (count - 1) * step;
  return (
    <span className="absolute inset-0">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="absolute inset-y-0"
          style={{ left: `${i * step}%`, width: `${width}%` }}
        >
          <LoadingImage
            src={src}
            alt=""
            sizes={sizes}
            spinnerClassName="size-5"
            className="object-contain"
          />
        </span>
      ))}
    </span>
  );
}

/**
 * One pack card. Its own component (rather than inline in PackCards' map)
 * because it needs useLocalizedAmount for its own variant — a Hook can't be
 * called from inside a .map() callback. Every derived number (per-unit price,
 * saving) comes from the *localized* amount, never the base-currency one.
 */
function PackCard({
  option,
  row,
  photo,
  fan,
  selected,
  soldOut,
  tag,
  featured,
  fallbackCurrencyCode,
  onSelect,
}: {
  option: ProductOption;
  row: PackRow;
  photo: CatalogImage | null;
  fan: boolean;
  selected: boolean;
  soldOut: boolean;
  tag: string | null;
  featured: boolean;
  fallbackCurrencyCode: string;
  onSelect: (value: string) => void;
}) {
  const { variant, count, label, value } = row;
  const { amount, currencyCode, compareAtAmount, loading } = useLocalizedAmount(
    variant?.id ?? null,
    variant?.price ?? 0,
    variant?.currencyCode ?? fallbackCurrencyCode,
    variant?.compareAtPrice ?? null,
  );
  const money = (n: number) => formatMoney(n, currencyCode, { trimZeroCents: true });
  const compareAtPrice = compareAtAmount !== null && compareAtAmount > amount ? compareAtAmount : null;
  // The saving as an amount: the variant's own compare-at less its price.
  const saved = compareAtPrice !== null ? Math.round((compareAtPrice - amount) * 100) / 100 : null;
  // Pack price ÷ units, cut (not rounded) to the cent: 49.99 ÷ 2 → 24.99.
  const unitPrice = count > 1 ? Math.floor((amount / count) * 100 + 1e-6) / 100 : null;

  const surface = featured
    ? cn("bg-sage-50", selected ? "border-sage-800" : "border-sage-600 hover:border-sage-800")
    : cn("bg-transparent", selected ? "border-sage-800" : "border-sand hover:border-sage-300");

  return (
    <label
      data-checked={selected}
      title={soldOut ? `${label} — sold out` : label}
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 py-3 transition-[border-color,transform] duration-200 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sage-800 motion-safe:active:scale-[0.985] sm:flex-col sm:gap-0 sm:px-3 sm:pt-6 sm:pb-3 sm:text-center",
        tag && "sm:pt-8",
        surface,
        soldOut && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="radio"
        id={optionInputId(option, value)}
        name={`option-${option.id}`}
        value={value}
        checked={selected}
        onChange={() => onSelect(value)}
        disabled={soldOut}
        className="sr-only"
      />

      {tag && (
        <span className="absolute -top-2.5 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-sage-800 px-2.5 py-1 font-ui text-[0.6rem] leading-none font-semibold tracking-[0.08em] text-ivory uppercase sm:-top-px sm:-left-px sm:right-auto sm:gap-0 sm:rounded-none sm:rounded-tl-2xl sm:rounded-br-[10px] sm:px-2.5 sm:py-1.5 sm:text-[0.68rem] sm:tracking-wide">
          <Icon name="star" className="size-3 sm:hidden" />
          {tag}
        </span>
      )}

      {/* Selection marker: on the photo's corner on phones, top-right of the card from sm up. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-2.5 right-2.5 hidden size-5 place-items-center rounded-full border-2 transition-colors duration-200 sm:grid",
          selected ? "border-sage-800 bg-sage-800" : "border-sand bg-ivory",
        )}
      >
        {selected && <Icon name="check" className="size-3 text-ivory" />}
      </span>

      <span className="relative block size-12 shrink-0 sm:aspect-square sm:size-auto sm:w-full sm:max-w-24">
        <span className="relative block size-full overflow-hidden rounded-xl sm:rounded-tag">
          {photo && <PackPhoto src={photo.url} units={count} fan={fan} sizes="112px" />}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "absolute -top-1.5 -left-1.5 grid size-4.5 place-items-center rounded-full border-2 bg-paper transition-colors duration-200 sm:hidden",
            selected ? "border-sage-800 bg-sage-800" : "border-sand",
          )}
        >
          {selected && <Icon name="check" className="size-2.5 text-ivory" />}
        </span>
      </span>

      <span className="flex min-w-0 flex-1 flex-col items-start sm:mt-2 sm:flex-none sm:items-center">
        <span className="font-ui text-[0.92rem] leading-tight font-semibold text-ink sm:text-body-sm sm:font-medium">
          {label}
        </span>
        {saved !== null && saved > 0 && (
          <span className="mt-1 rounded-tag bg-sage-800 px-1.5 py-0.5 font-numeral text-[0.68rem] leading-none font-medium text-ivory tabular-nums sm:mt-1.5 sm:px-2 sm:text-[0.7rem]">
            Save {money(saved)}
          </span>
        )}
        {soldOut && variant && <span className="mt-1 text-[0.7rem] text-ink-soft">Sold out</span>}
      </span>

      {variant &&
        (loading ? (
          <Skeleton className="h-5 w-14 shrink-0" />
        ) : (
          <span className="flex shrink-0 flex-col items-end sm:mt-1 sm:items-center">
            {compareAtPrice !== null && (
              <span className="font-numeral text-[0.7rem] text-ink-faint tabular-nums line-through decoration-1">
                {money(compareAtPrice)}
              </span>
            )}
            <span className="font-numeral text-[1.15rem] leading-none font-semibold tracking-tight text-ink tabular-nums sm:text-body-lg">
              {money(amount)}
            </span>
            {unitPrice !== null && (
              <span className="mt-1 font-numeral text-[0.66rem] leading-none text-ink-soft tabular-nums sm:mt-0.5 sm:text-[0.68rem]">
                {money(unitPrice)} each
              </span>
            )}
          </span>
        ))}
    </label>
  );
}

/* ── Quantity ──────────────────────────────────────────────────────────── */

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
    "grid size-11 cursor-pointer place-items-center rounded-control text-lg text-ink transition hover:bg-sand focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <div className="shrink-0">
      <label htmlFor="pdp-quantity" className="sr-only">
        Quantity
      </label>
      <div className="flex h-13 w-fit items-center rounded-control bg-porcelain px-1 shadow-[inset_0_0_0_1px_rgb(58_42_24/0.1)]">
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
          className="w-8 [appearance:textfield] bg-transparent text-center font-numeral text-base tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none"
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

/* ── Free delivery strip ───────────────────────────────────────────────── */

/** Confetti pieces: where each flies (px), its spin, and its colour. */
const CONFETTI = [
  { x: -46, y: -30, r: -200, c: "bg-gold-500" },
  { x: -30, y: 34, r: 160, c: "bg-sage-400" },
  { x: -64, y: 4, r: 240, c: "bg-clay-300" },
  { x: 8, y: -42, r: -120, c: "bg-sage-400" },
  { x: 44, y: -34, r: 220, c: "bg-gold-500" },
  { x: 60, y: 6, r: -180, c: "bg-clay-300" },
  { x: 34, y: 38, r: 140, c: "bg-sage-400" },
  { x: -8, y: 44, r: -240, c: "bg-gold-500" },
] as const;

/**
 * Celebratory "free delivery unlocked" strip, in the spirit of food-delivery
 * apps: a green-toned bar, a truck that drives in, a one-off confetti burst and
 * a soft light sweep. Decorative motion only; the text carries the message.
 * Rendered only when the store's shipping note really says shipping is free.
 */
function FreeDeliveryUnlocked() {
  return (
    <div className="relative min-w-0 flex-1 basis-56 overflow-hidden rounded-lg border border-dashed border-sage-300 bg-sage-50 py-1.5 pr-3 pl-2 text-sage-800">
      <span
        aria-hidden="true"
        className="unlock-anim pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-transparent via-white/70 to-transparent motion-safe:animate-[unlock-sweep_3.6s_ease-in-out_infinite]"
      />
      <div className="relative flex items-center gap-3">
        <span className="relative grid size-9 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className="unlock-anim absolute inset-0 rounded-full border-2 border-sage-400/60 motion-safe:animate-[unlock-ring_1.8s_ease-out_0.5s_2]"
          />
          {CONFETTI.map((p, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={cn(
                "unlock-anim absolute top-1/2 left-1/2 h-1.5 w-1 rounded-[1px] opacity-0",
                p.c,
                "motion-safe:animate-[unlock-burst_1.1s_ease-out_0.35s_1_both]",
              )}
              style={
                {
                  "--bx": `${p.x}px`,
                  "--by": `${p.y}px`,
                  "--br": `${p.r}deg`,
                } as React.CSSProperties
              }
            />
          ))}
          <span className="unlock-anim relative grid size-9 place-items-center text-sage-600 motion-safe:animate-[unlock-truck_0.7s_cubic-bezier(0.2,0.8,0.3,1)_both]">
            <Icon name="truck" className="size-6" strokeWidth={1.6} />
          </span>
          <span
            aria-hidden="true"
            className="unlock-anim absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full border-2 border-sage-50 bg-success text-white motion-safe:animate-[unlock-tick_0.4s_cubic-bezier(0.3,1.6,0.5,1)_0.6s_both]"
          >
            <Icon name="check" className="size-2.5" strokeWidth={3} />
          </span>
        </span>
        <p className="min-w-0 leading-tight">
          <span className="block font-ui text-[0.82rem] font-semibold tracking-tight">
            Yay! Free delivery unlocked
          </span>
          <span className="block text-[0.7rem] text-ink-soft">Applied to this order</span>
        </p>
      </div>
    </div>
  );
}
