/**
 * Reviewer portraits shown in front of the PDP rating.
 *
 * The images are real faces scraped from review feeds (see
 * reference/public/avatars) and copied into `public/avatars` so they are
 * served statically. They are decorative — the stack is `aria-hidden` and the
 * rating line keeps a text label with the real aggregate.
 *
 * Selection is deterministic per product handle: the same product always shows
 * the same four faces, so nothing shifts between ISR renders or on navigation.
 */
const AVATARS = [
  "/avatars/reviewer-01.jpg",
  "/avatars/reviewer-02.jpg",
  "/avatars/reviewer-03.jpg",
  "/avatars/reviewer-04.jpg",
  "/avatars/reviewer-05.jpg",
  "/avatars/reviewer-06.jpg",
  "/avatars/reviewer-07.jpg",
  "/avatars/reviewer-08.jpg",
  "/avatars/reviewer-09.jpg",
  "/avatars/reviewer-10.jpg",
  "/avatars/reviewer-11.jpg",
  "/avatars/reviewer-12.jpg",
  "/avatars/reviewer-13.jpg",
  "/avatars/reviewer-14.jpg",
  "/avatars/reviewer-15.jpg",
  "/avatars/reviewer-16.jpg",
] as const;

function hash(text: string): number {
  let h = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    h ^= text.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function reviewerAvatars(seed: string, count = 4): string[] {
  const start = hash(seed) % AVATARS.length;
  // Stride 5 is coprime with the 16 portraits, so four picks never repeat.
  return Array.from(
    { length: count },
    (_, offset) => AVATARS[(start + offset * 5) % AVATARS.length] ?? AVATARS[0],
  );
}
