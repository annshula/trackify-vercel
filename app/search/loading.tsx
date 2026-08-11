import { Skeleton } from '@/components/ui/primitives';

/**
 * Search-only loading boundary.
 *
 * Deliberately scoped to /search rather than the app root: a root-level
 * loading.tsx starts streaming the response before the page runs, which flushes
 * a 200 status and turns every `notFound()` into a soft 404. Search always
 * resolves to a page, so streaming is safe here.
 */
export default function SearchLoading() {
  return (
    <div className="container-page py-8">
      <span className="sr-only" role="status">
        Searching
      </span>

      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="mt-3 h-4 w-40" />

      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index}>
            <Skeleton className="aspect-4/5 w-full rounded-lg" />
            <Skeleton className="mt-3.5 h-3 w-16" />
            <Skeleton className="mt-2 h-3.5 w-3/4" />
            <Skeleton className="mt-2 h-3.5 w-1/3" />
          </li>
        ))}
      </ul>
    </div>
  );
}
