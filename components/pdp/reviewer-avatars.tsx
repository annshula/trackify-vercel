import Image from "next/image";

import { cn } from "@/lib/utils/cn";

/**
 * Overlapping circular reviewer portraits, shown in front of the buy-box
 * rating.
 *
 * Portraits come from `lib/pdp/reviewer-avatars.ts` (static files under
 * `public/avatars`). They are decorative: the stack is hidden from screen
 * readers and the rating line already announces the real aggregate in text.
 */
export function ReviewerAvatars({
  photos,
  className,
}: {
  photos: string[];
  className?: string;
}) {
  const unique = Array.from(new Set(photos)).slice(0, 4);
  if (unique.length === 0) return null;

  return (
    <span
      aria-hidden="true"
      className={cn("flex shrink-0 items-center -space-x-2", className)}
    >
      {unique.map((src, index) => (
        // Leftmost on top, so the stack reads as one fanned-out row.
        <span
          key={src}
          className="relative size-6 overflow-hidden rounded-full bg-porcelain ring-2 ring-canvas"
          style={{ zIndex: unique.length - index }}
        >
          <Image src={src} alt="" fill sizes="24px" className="object-cover" />
        </span>
      ))}
    </span>
  );
}
