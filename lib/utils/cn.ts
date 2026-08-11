type ClassValue = string | number | null | undefined | false | ClassValue[] | Record<string, boolean | undefined | null>;

/**
 * Minimal class joiner with last-wins conflict resolution for the small set of
 * Tailwind utilities we actually override in this codebase.
 *
 * Deliberately dependency-free: `clsx` + `tailwind-merge` add ~10kb to solve a
 * problem we only have in a handful of components.
 */
function flatten(input: ClassValue, out: string[]): void {
  if (!input) return;
  if (typeof input === 'string' || typeof input === 'number') {
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

/** Utilities whose "group" is the first token before the first dash. */
const CONFLICT_PREFIXES = [
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
  'w', 'h', 'min-w', 'min-h', 'max-w', 'max-h',
  'text', 'font', 'leading', 'tracking',
  'bg', 'border', 'rounded', 'shadow', 'gap', 'grid-cols', 'flex', 'items', 'justify',
];

function groupOf(cls: string): string | null {
  // Preserve variants (hover:, md:, dark:) as part of the group key.
  const lastColon = cls.lastIndexOf(':');
  const variant = lastColon === -1 ? '' : cls.slice(0, lastColon + 1);
  const base = lastColon === -1 ? cls : cls.slice(lastColon + 1);
  const bare = base.startsWith('-') ? base.slice(1) : base;

  let best: string | null = null;
  for (const prefix of CONFLICT_PREFIXES) {
    if (bare === prefix || bare.startsWith(`${prefix}-`)) {
      if (!best || prefix.length > best.length) best = prefix;
    }
  }
  return best ? `${variant}${best}` : null;
}

export function cn(...inputs: ClassValue[]): string {
  const raw: string[] = [];
  flatten(inputs, raw);

  const tokens = raw.join(' ').split(/\s+/).filter(Boolean);
  const seenGroup = new Map<string, number>();
  const result: (string | null)[] = [];

  for (const token of tokens) {
    const group = groupOf(token);
    if (group) {
      const previous = seenGroup.get(group);
      if (previous !== undefined) result[previous] = null;
      seenGroup.set(group, result.length);
    }
    result.push(token);
  }

  return result.filter((t): t is string => t !== null).join(' ');
}
