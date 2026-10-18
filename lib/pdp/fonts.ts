import {
  Figtree,
  Fraunces,
  Jost,
  Manrope,
  Plus_Jakarta_Sans,
  Poppins,
} from "next/font/google";

/**
 * The product page's type system. Each face has one job
 * (see `app/pdp-theme.css` for the CSS side). They are applied on the PDP
 * wrapper only — never in the root layout — so only this route downloads them
 * and the rest of the site keeps Sora + Inter.
 *
 *  - Manrope: body copy.
 *  - Fraunces: editorial serif (soft optical axis) for card headings and
 *    numerals-as-display.
 *  - Jost: interface chrome — buttons, eyebrows, badges, labels.
 *  - Poppins: prices and standalone figures.
 *  - Figtree: the product title (long, keyword-heavy Shopify titles need a
 *    plain, highly legible face at small-to-medium sizes).
 *  - Plus Jakarta Sans: section headings.
 */
export const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--ff-sans",
  preload: false,
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue"],
});

export const serif = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "variable",
  axes: ["SOFT", "opsz"],
  variable: "--ff-serif",
  preload: false,
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const ui = Jost({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--ff-ui",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue"],
});

export const numeral = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--ff-numeral",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue"],
});

export const title = Figtree({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--ff-title",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue"],
});

export const pdpHeading = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--ff-pdp-heading",
  display: "swap",
  preload: false,
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Helvetica Neue"],
});

/** All six variable classes, to put on the PDP wrapper. */
export const pdpFontVariables = [
  sans.variable,
  serif.variable,
  ui.variable,
  numeral.variable,
  title.variable,
  pdpHeading.variable,
].join(" ");
