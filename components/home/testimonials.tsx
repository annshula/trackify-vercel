import { testimonials } from '@/lib/content/testimonials';
import { SectionHeading } from '@/components/ui/primitives';
import { QuoteIcon } from '@/components/ui/icons';
import { DragScroll } from '@/components/ui/drag-scroll';

/**
 * Server-rendered — no autoplay JS. A mouse can drag the row (via DragScroll,
 * the same pattern used on the collections rail); touch scrolls natively.
 * Full text is in the initial HTML either way, so this costs nothing for SEO.
 */
export function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <section className="container-page py-14" aria-labelledby="testimonials-heading">
      <SectionHeading eyebrow="Word of mouth" title="What people are saying" className="mb-8" />
      <h2 id="testimonials-heading" className="sr-only">
        Customer testimonials
      </h2>

      <DragScroll
        as="ul"
        className="hide-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {testimonials.map((testimonial) => (
          <li
            key={testimonial.id}
            className="w-[85vw] shrink-0 snap-center rounded-xl border border-line bg-surface p-6 sm:w-96 sm:p-8"
          >
            <QuoteIcon size={28} className="text-accent" />
            <p className="mt-4 text-base leading-relaxed text-ink">
              {testimonial.quote}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {testimonial.author.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-medium">{testimonial.author}</p>
                <p className="text-xs text-ink-subtle">{testimonial.role}</p>
              </div>
            </div>
          </li>
        ))}
      </DragScroll>
    </section>
  );
}
