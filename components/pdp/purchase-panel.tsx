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
import type { CatalogImage, CatalogProduct } from "@/types/catalog";
import { PdpIcon } from "./pdp-icon";
import { usePurchase } from "./purchase-context";
import { AddToCartButton } from "./add-to-cart-button";
import { UgcMedia } from "./ugc-media";

export type Reassurance = { icon: string | null; label: string };

type ProductOption = CatalogProduct["options"][number];

/**
 * Matches a variant option that's really a pack-size/quantity choice
 * (e.g. this catalog's "Quantity" option with values "1PC"/"2PCS"/"3PCS").
 * When a product already sells pack sizes as their own SKUs, the numeric
 * stepper would be a second, disagreeing answer to "how many", so it's hidden
 * whenever this option is present.
 */
const QUANTITY_OPTION_NAME = /^(quantity|qty|pack)$/i;

/**
 * The above-the-fold purchase column, top to bottom: is it any good (rating)
 * → what is it (title, perks) → which one (style, pack) → what it costs →
 * buy → how they'll pay and what's promised after → real customers using it.
 *
 * Choices are shown as pictures and icons wherever the catalog has them — a
 * style with its own photo becomes an image card, a pack size shows its unit
 * count as icons — so the shopper sees what they're picking instead of
 * reading option labels.
 */
export function PurchasePanel({
  subtitle,
  perks,
  rating,
  reassurance,
  delivery,
}: {
  subtitle: string | null;
  /** Short benefit lines under the title — filled-tick list, 4–6 lines. */
  perks: string[];
  rating: { value: number; count: number } | null;
  reassurance: Reassurance[];
  /** Delivery estimate, e.g. "3–8 days" — the product's own, else the store's; null hides the line. */
  delivery: string | null;
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
  const lowStock = lowStockCount(variant);
  const hasQuantityOption = options.some((option) => QUANTITY_OPTION_NAME.test(option.name));

  return (
    <div className="flex flex-col">
      {rating && rating.count > 0 && (
        <a
          href="#reviews"
          className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-muted transition hover:border-line-strong"
        >
          <Rating value={rating.value} showValue={false} size={14} />
          <span className="font-medium text-ink tabular-nums">{rating.value.toFixed(1)}</span>
          <span className="tabular-nums">
            ({rating.count} review{rating.count === 1 ? "" : "s"})
          </span>
        </a>
      )}

      <h1
        className={cn(
          "font-display leading-[1.2] tracking-tight text-balance text-ink",
          // Dropshipped titles often run 150+ characters of search keywords;
          // at display size they'd fill the fold, so long ones step down.
          product.title.length > 90
            ? "text-xl"
            : product.title.length > 60
              ? "text-2xl"
              : "text-3xl",
        )}
      >
        {product.title}
      </h1>
      {subtitle && <p className="mt-3 text-sm leading-relaxed text-ink-muted text-pretty">{subtitle}</p>}

      {perks.length > 0 && (
        <ul className="mt-5 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2.5 text-sm text-ink">
              <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                <CheckMark className="size-3" />
              </span>
              {perk}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-7 space-y-6">
        {options.map((option) => {
          const available = availableValuesFor(product, option.name, selection);
          const chosen = selection[option.name];
          const onSelect = (value: string) => selectOption(option.name, value);

          if (QUANTITY_OPTION_NAME.test(option.name)) {
            return (
              <PackPicker
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
          // picture; colours and plain text options stay a pill row.
          const photos = option.values.map((value) => variantImageFor(product, option.name, value));
          const distinctPhotos = new Set(photos.filter(Boolean).map((image) => image!.url)).size;
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
            <PillOptionPicker
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

      <div className="mt-7">
        <Price
          amount={price}
          compareAt={compareAt}
          currencyCode={product.priceRange.currencyCode}
          size="xl"
          priceClassName="font-display font-semibold"
        />
        <p className="mt-1 text-xs text-ink-subtle">Taxes and shipping calculated at checkout.</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {!hasQuantityOption && (
          <QuantityStepper
            value={quantity}
            max={maxQuantity}
            onChange={setQuantity}
            disabled={soldOut || unavailable}
          />
        )}
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0" ref={setHeroCta}>
            <AddToCartButton size="lg" showPrice={false} announce />
          </div>
          {!soldOut && !unavailable && (
            <button
              type="button"
              onClick={buyNow}
              disabled={buying}
              className="h-14 min-w-0 cursor-pointer rounded-full border border-ink px-4 text-base font-medium text-ink transition duration-200 hover:bg-ink hover:text-ink-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
            >
              {buying ? "Opening checkout…" : "Buy it now"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {/* Payment icons read first, above delivery — both mobile and desktop. */}
        <PaymentIcons />
        {delivery && <DeliveryEstimate estimate={delivery} />}
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
        <ul
          className={cn(
            "mt-6 grid gap-2",
            reassurance.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3",
          )}
        >
          {reassurance.map((item) => (
            <li
              key={item.label}
              className="flex h-full flex-col items-center justify-center gap-1.5 rounded-lg bg-surface-sunken/70 px-2 py-3 text-center text-xs font-medium text-ink"
            >
              <PdpIcon icon={item.icon} size={22} className="text-accent" />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      <UgcMedia items={product.pdp.ugcMedia} />
    </div>
  );
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function OptionLegend({ name, chosen }: { name: string; chosen: string | undefined }) {
  return (
    <legend className="text-sm text-ink-muted">
      {name}: <span className="font-medium text-ink">{chosen}</span>
    </legend>
  );
}

const optionInputId = (option: ProductOption, value: string) =>
  `opt-${option.id}-${value}`.replace(/[^a-zA-Z0-9-_]/g, "-");

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
    <fieldset>
      <OptionLegend name={option.name} chosen={chosen} />
      <div className="mt-3 grid grid-cols-3 gap-3">
        {option.values.map((value, index) => {
          const inputId = optionInputId(option, value);
          const selected = chosen === value;
          const outOfStock = !available.has(value);
          return (
            <div key={value}>
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
                  "flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border bg-surface-raised transition duration-200",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                  selected ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong",
                )}
              >
                {/* Short, contained thumbnails keep the pickers, price and
                    buttons inside the first screen on a laptop. */}
                <span className="relative block h-24 bg-white sm:h-28">
                  <Image
                    src={photos[index]!.url}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 10rem, 30vw"
                    className={cn("object-contain p-1.5", outOfStock && "opacity-40 grayscale")}
                  />
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-ink text-ink-inverse">
                      <CheckMark className="size-3" />
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "px-2 py-2 text-center text-xs leading-tight sm:text-sm",
                    selected ? "font-medium text-ink" : "text-ink-muted",
                  )}
                >
                  {value}
                  {outOfStock && <span className="block text-2xs text-ink-subtle">Sold out</span>}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Colour swatches and plain text options — the compact pill row. */
function PillOptionPicker({
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
    <fieldset>
      <OptionLegend name={option.name} chosen={chosen} />
      <div className="mt-3 flex flex-wrap gap-2.5">
        {option.values.map((value) => {
          const inputId = optionInputId(option, value);
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
                onChange={() => onSelect(value)}
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
}

/**
 * Pack sizes as stacked rows — the "bundle and save" layout Shopify themes
 * use: radio, unit icons, pack name with its per-unit price and saving on the
 * left; total (and what that many single packs would cost) on the right.
 * Each value is its own Shopify variant (SKU) with its own price, so every
 * number is that variant's real price — never a client-side multiplier. The
 * middle pack of three or more is marked most popular.
 */
function PackPicker({
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
  const baseVariant = findVariantByOptions(product, { ...selection, [option.name]: option.values[0]! });
  const baseUnitPrice = baseVariant?.price ?? null;

  return (
    <fieldset>
      <legend className="text-sm text-ink-muted">Choose your pack</legend>
      <div className="mt-3 space-y-2.5">
        {option.values.map((value, index) => {
          const tileVariant = findVariantByOptions(product, { ...selection, [option.name]: value });
          const selected = chosen === value;
          const outOfStock = !available.has(value) || !tileVariant;
          const count = parseInt(value, 10) || index + 1;
          const perUnit = tileVariant ? tileVariant.price / count : null;
          const savePercent =
            baseUnitPrice && tileVariant && count > 1
              ? Math.round((1 - tileVariant.price / (baseUnitPrice * count)) * 100)
              : null;
          const inputId = optionInputId(option, value);
          const popular = index === 1 && option.values.length >= 3;
          const money = (amount: number) =>
            formatMoney(amount, tileVariant?.currencyCode ?? product.priceRange.currencyCode, { trimZeroCents: true });
          const singlesTotal = baseUnitPrice && count > 1 ? baseUnitPrice * count : null;
          return (
            <div key={value}>
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
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition duration-200",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                  selected
                    ? "border-ink bg-surface-raised ring-1 ring-ink"
                    : "border-line bg-surface-raised/60 hover:border-line-strong",
                  outOfStock && "opacity-50",
                )}
              >
                {/* Radio mark */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border-2 transition",
                    selected ? "border-ink" : "border-line-strong",
                  )}
                >
                  {selected && <span className="size-2.5 rounded-full bg-ink" />}
                </span>

                <UnitIcons count={count} selected={selected} />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-ink">
                      {count} {count === 1 ? "pack" : "packs"}
                    </span>
                    {popular && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-2xs font-semibold whitespace-nowrap text-on-accent">
                        Most popular
                      </span>
                    )}
                    {savePercent !== null && savePercent > 0 && (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-2xs font-semibold whitespace-nowrap text-success">
                        Save {savePercent}%
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs tabular-nums text-ink-subtle">
                    {outOfStock
                      ? "Sold out"
                      : count > 1 && perUnit !== null
                        ? `${money(perUnit)} each`
                        : "Standard price"}
                  </span>
                </span>

                {tileVariant && (
                  <span className="shrink-0 text-right">
                    <span className="block text-base font-semibold tabular-nums text-ink">{money(tileVariant.price)}</span>
                    {singlesTotal !== null && singlesTotal > tileVariant.price && (
                      <span className="block text-xs tabular-nums text-ink-subtle line-through">{money(singlesTotal)}</span>
                    )}
                  </span>
                )}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * "Delivery in 3–8 days", plus the calendar dates that range lands on if
 * ordered today. The dates are worked out after mount — the page is
 * statically rendered, so a server-side "today" would be stale — and the
 * line reads fine without them. Falls back to the bare estimate when it
 * doesn't contain a day range.
 */
function DeliveryEstimate({ estimate }: { estimate: string }) {
  const [arrives, setArrives] = React.useState<string | null>(null);

  React.useEffect(() => {
    const match = estimate.match(/(\d+)\s*(?:–|-|to)\s*(\d+)\s*(?:business\s*)?days?/i);
    if (!match) return;
    const format = (days: number) => {
      const date = new Date();
      date.setDate(date.getDate() + days);
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };
    // Today's date is only knowable in the browser; this is a one-time sync from it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArrives(`${format(Number(match[1]))} – ${format(Number(match[2]))}`);
  }, [estimate]);

  return (
    <p className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-raised px-3.5 py-2.5 text-sm">
      <PdpIcon icon="truck" size={20} className="mt-px shrink-0 text-accent" />
      <span>
        <span className="font-medium text-ink">Delivery in {estimate}</span>
        {arrives && <span className="block text-xs text-ink-muted">Order today, arrives {arrives}</span>}
      </span>
    </p>
  );
}

/** Up to three small canister marks, so pack size reads as a picture; bigger packs add "+N". */
function UnitIcons({ count, selected }: { count: number; selected: boolean }) {
  const shown = Math.min(count, 3);
  return (
    <span className={cn("flex h-6 w-11 shrink-0 items-end justify-center gap-0.5", selected ? "text-accent" : "text-ink-subtle")} aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (
        <svg key={i} viewBox="0 0 12 24" className="h-6 w-3" fill="currentColor">
          <rect x="3" y="0" width="6" height="4" rx="1.5" opacity="0.55" />
          <rect x="1" y="4" width="10" height="20" rx="2.5" />
        </svg>
      ))}
      {count > 3 && <span className="ml-0.5 text-xs font-semibold">+{count - 3}</span>}
    </span>
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
      <div className="flex h-14 w-fit items-center rounded-full border border-line-strong px-1.5">
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
 * Accepted-payment marks under the buttons — the row itself is the "secure
 * checkout" reassurance. Inline SVG, so it never depends on a logo file.
 *
 * Only methods the store actually takes: the card brands and wallets are
 * what Shopify reports in `shop.paymentSettings` (Storefront API, checked
 * 2026-09-26). Update this list if Shopify Payments settings change —
 * showing a logo checkout doesn't offer is a broken promise at the till.
 */
function PaymentIcons() {
  const methods: { name: string; mark: React.ReactNode }[] = [
    {
      name: "Shop Pay",
      mark: (
        <svg viewBox="0 0 44 18" className="h-4 w-auto" aria-hidden="true">
          <rect width="44" height="18" rx="3" fill="#5A31F4" />
          <text x="22" y="12.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="800" fontStyle="italic" fill="#fff">
            shop<tspan fontWeight="600" fontStyle="normal">Pay</tspan>
          </text>
        </svg>
      ),
    },
    {
      name: "Visa",
      mark: (
        <svg viewBox="0 0 40 16" className="h-3.5 w-auto" aria-hidden="true">
          <text x="0" y="13" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="800" fontStyle="italic" fill="#1A1F71">
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
      name: "American Express",
      mark: (
        <svg viewBox="0 0 40 16" className="h-4 w-auto" aria-hidden="true">
          <rect width="40" height="16" rx="2" fill="#1F72CD" />
          <text x="20" y="11.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8" fontWeight="800" fill="#fff">
            AMEX
          </text>
        </svg>
      ),
    },
    {
      name: "Discover",
      mark: (
        <svg viewBox="0 0 52 16" className="h-3.5 w-auto" aria-hidden="true">
          <text x="0" y="12" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="800" fill="#231F20">
            DISC
          </text>
          <circle cx="32.5" cy="8.5" r="4.6" fill="#F58220" />
          <text x="38" y="12" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="800" fill="#231F20">
            VER
          </text>
        </svg>
      ),
    },
    {
      name: "Diners Club",
      mark: (
        <svg viewBox="0 0 24 18" className="h-4 w-auto" aria-hidden="true">
          <circle cx="12" cy="9" r="8" fill="#0079BE" />
          <circle cx="12" cy="9" r="5.2" fill="#fff" />
          <path d="M10.4 5.4v7.2a3.8 3.8 0 0 1 0-7.2zM13.6 5.4a3.8 3.8 0 0 1 0 7.2z" fill="#0079BE" />
        </svg>
      ),
    },
    {
      name: "Apple Pay",
      mark: (
        <svg viewBox="0 0 36 18" className="h-4 w-auto" aria-hidden="true">
          <path
            d="M7.4 4.3c.4-.5.7-1.2.6-1.8-.6 0-1.3.4-1.7.9-.4.4-.7 1.1-.6 1.7.6 0 1.2-.3 1.7-.8zM8 5.3c-.9-.1-1.7.5-2.1.5-.4 0-1.1-.5-1.8-.5-1 0-1.8.6-2.3 1.4-1 1.7-.3 4.3.7 5.7.5.7 1 1.5 1.8 1.4.7 0 1-.5 1.9-.5s1.1.5 1.9.5c.8 0 1.3-.7 1.8-1.4.5-.8.8-1.5.8-1.6 0 0-1.5-.6-1.5-2.3 0-1.5 1.2-2.1 1.3-2.2-.7-1-1.8-1.1-2.2-1.1z"
            fill="currentColor"
          />
          <text x="12.5" y="13" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="600" fill="currentColor">
            Pay
          </text>
        </svg>
      ),
    },
    {
      name: "Google Pay",
      mark: (
        <svg viewBox="0 0 38 18" className="h-4 w-auto" aria-hidden="true">
          <text x="0" y="13" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700">
            <tspan fill="#4285F4">G</tspan>
            <tspan fill="#5F6368" dx="1">Pay</tspan>
          </text>
        </svg>
      ),
    },
  ];

  return (
    <ul className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Accepted payment methods">
      {methods.map((m) => (
        <li
          key={m.name}
          title={m.name}
          className="flex h-7 min-w-11 items-center justify-center rounded-md border border-line bg-surface-raised px-2 text-ink"
        >
          {m.mark}
          <span className="sr-only">{m.name}</span>
        </li>
      ))}
    </ul>
  );
}
