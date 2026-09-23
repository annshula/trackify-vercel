import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";

const HERO_DIR = path.join(process.cwd(), "public", "hero");
const HERO_MOBILE_DIR = path.join(HERO_DIR, "mobile");
const IMAGE_EXTENSIONS = new Set([".avif", ".webp", ".jpg", ".jpeg", ".png"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);

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

async function findVideoIn(dir: string, baseUrl: string): Promise<string | null> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const match = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
    return match ? `${baseUrl}/${match}` : null;
  } catch {
    return null;
  }
}

/**
 * A real extracted frame from the hero video (e.g. trackify-hero-desktop.avif),
 * dropped in the same folder as the video. Used as the <video poster> so the
 * still shown before playback starts is a frame of the footage itself, not an
 * unrelated catalog photo — the video then plays in place with no visible
 * swap once it's ready.
 */
async function findPosterIn(dir: string, baseUrl: string): Promise<string | null> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const match = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) &&
          entry.name.toLowerCase().includes("poster") === false &&
          entry.name.toLowerCase().includes("hero"),
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0];
    return match ? `${baseUrl}/${match}` : null;
  } catch {
    return null;
  }
}

/**
 * Desktop/tablet hero video, dropped into public/hero/ alongside the still
 * photography. Only the first match (by filename) is used — one looping
 * background video, not a rotation. Returns null when none exists, so the
 * caller falls back to the image carousel.
 */
export async function findHeroVideo(): Promise<string | null> {
  return findVideoIn(HERO_DIR, "/hero");
}

/**
 * Mobile-only hero video, dropped into public/hero/mobile/. Same
 * one-match-wins rule as the desktop video; returns null when none exists,
 * so the caller falls back to the mobile image cover.
 */
export async function findHeroMobileVideo(): Promise<string | null> {
  return findVideoIn(HERO_MOBILE_DIR, "/hero/mobile");
}

/**
 * Poster frame for the desktop/tablet hero video (public/hero/*.avif etc,
 * named with "hero" in it). Falls back to null — caller then falls back to
 * the first carousel slide — when no such frame was extracted.
 */
export async function findHeroVideoPoster(): Promise<string | null> {
  return findPosterIn(HERO_DIR, "/hero");
}

/**
 * Poster frame for the mobile hero video (public/hero/mobile/*.avif etc).
 */
export async function findHeroMobileVideoPoster(): Promise<string | null> {
  return findPosterIn(HERO_MOBILE_DIR, "/hero/mobile");
}
