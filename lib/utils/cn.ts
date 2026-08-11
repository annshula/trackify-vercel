import { twMerge } from "tailwind-merge";

type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[]
  | Record<string, boolean | undefined | null>;

/**
 * Class joiner with correct Tailwind conflict resolution.
 *
 * `clsx`-style flattening (arrays, objects, falsy values) feeds into
 * `tailwind-merge`, which understands the real CSS properties behind each
 * utility: `flex` (display) and `flex-col` (direction) are distinct and both
 * survive, while a genuine conflict like `p-2 p-4` resolves last-wins.
 *
 * The previous hand-rolled prefix grouping conflated distinct properties that
 * share a prefix, silently dropping `display:flex` whenever `flex-col`
 * appeared and breaking centering site-wide.
 */
function flatten(input: ClassValue, out: string[]): void {
  if (!input) return;
  if (typeof input === "string" || typeof input === "number") {
    out.push(String(input));
    return;
  }
  if (Array.isArray(input)) {
    for (const item of input) flatten(item, out);
    return;
  }
  for (const [key, enabled] of Object.entries(input)) {
    if (enabled) out.push(key);
  }
}

export function cn(...inputs: ClassValue[]): string {
  const raw: string[] = [];
  for (const input of inputs) flatten(input, raw);
  return twMerge(raw.join(" "));
}
