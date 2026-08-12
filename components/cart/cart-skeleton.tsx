import { Skeleton } from '@/components/ui/primitives';

/**
 * Loading placeholder for the bag.
 *
 * Mirrors CartDrawerLine's geometry — same thumbnail size, same rows, same
 * padding — so the real lines swap in without the panel jumping. It also stops
 * the empty state flashing "Your bag is empty" before the first response has
 * even arrived, which reads as "you lost my items" rather than "loading".
 */
export function CartSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="px-5" role="status" aria-live="polite">
      <span className="sr-only">Loading your bag</span>

      <ul className="divide-y divide-line">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex gap-4 py-4">
            <Skeleton className="size-20 shrink-0 rounded-md sm:size-24" />

            <div className="flex min-w-0 flex-1 flex-col">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/3" />

              <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-3.5 w-14" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Wider variant for the full cart page, matching CartPageLine's proportions. */
export function CartPageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading your bag</span>

        <ul className="divide-y divide-line border-y border-line">
          {Array.from({ length: rows }, (_, index) => (
            <li key={index} className="flex gap-4 py-6 sm:gap-6">
              <Skeleton className="size-24 shrink-0 rounded-md sm:size-32" />

              <div className="flex min-w-0 flex-1 flex-col">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2 h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                  <Skeleton className="h-11 w-32 rounded-md" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-lg border border-line bg-surface p-5 sm:p-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-5 h-11 w-full rounded-md" />
          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="mt-5 h-13 w-full rounded-md" />
        </div>
      </aside>
    </div>
  );
}
