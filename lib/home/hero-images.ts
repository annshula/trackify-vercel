import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";

const HERO_DIR = path.join(process.cwd(), "public", "hero");
const HERO_MOBILE_DIR = path.join(HERO_DIR, "mobile");
const IMAGE_EXTENSIONS = new Set([".avif", ".webp", ".jpg", ".jpeg", ".png"]);

async function listImagesIn(dir: string, baseUrl: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((name) => `${baseUrl}/${name}`);
  } catch {
    return [];
  }
}

/**
 * Custom desktop/tablet hero photography, dropped into public/hero/ by
 * whoever runs the store — no code change needed to swap them. Sorted by
 * filename (hero-1, hero-2, …) so the drop order controls slide order.
 *
 * Returns [] when the folder is empty or missing; the caller falls back to
 * real catalog photography so the hero never has nothing to show.
 */
export async function listHeroImages(): Promise<string[]> {
  return listImagesIn(HERO_DIR, "/hero");
}

/**
 * Mobile-only hero cover, dropped into public/hero/mobile/ by whoever runs
 * the store. Rendered beneath the md breakpoint; the desktop slideshow only
 * ever sees the top-level public/hero/ folder, so a portrait mobile cover
 * never leaks into the desktop rotation.
 */
export async function listHeroMobileImages(): Promise<string[]> {
  return listImagesIn(HERO_MOBILE_DIR, "/hero/mobile");
}
