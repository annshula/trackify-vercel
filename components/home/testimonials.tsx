import { testimonials, type Testimonial } from '@/lib/content/testimonials';
import { SectionHeading, Rating } from '@/components/ui/primitives';
import { QuoteIcon } from '@/components/ui/icons';

/**
 * Two-row marquee: row one drifts right-to-left, row two drifts the
 * opposite way, so they read as counter-rotating rather than a single
 * mechanical strip. Pure CSS animation (see the tf-marquee-* utilities in
 * globals.css) — no JS driving the motion, so it never fights hydration and
 * costs nothing for a crawler, which sees every card in the initial HTML
 * either way (the "duplicate" half is `aria-hidden`, not hidden content).
 *
 * Splits the list into two rows by parity (even/odd index) rather than a
 * straight first-half/second-half slice, so both rows draw from across the
 * whole set instead of row two only ever showing whatever was appended last.
 */
export function Testimonials() {
  if (testimonials.length === 0) return null;

  const rowA = testimonials.filter((_, index) => index % 2 === 0);
  const rowB = testimonials.filter((_, index) => index % 2 === 1);

  return (
    <section className="overflow-hidden py-14" aria-labelledby="testimonials-heading">
      <div className="container-page">
        <SectionHeading eyebrow="Word of mouth" title="What people are saying" align="center" className="mb-10" />
        <h2 id="testimonials-heading" className="sr-only">
          Customer testimonials
        </h2>
      </div>

      {/* Full-bleed, outside container-page: the rail needs its own edges to
          run past the viewport, and the fade masks below rely on that. */}
      <div className="relative">
        {/* Edge fades hint that the row continues past the viewport, and
            visually soften the loop point instead of a hard content cut. */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-canvas to-transparent sm:w-24"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-canvas to-transparent sm:w-24"
          aria-hidden="true"
        />

        <MarqueeRow items={rowA} direction="left" />
        <MarqueeRow items={rowB} direction="right" className="mt-4" />
      </div>
    </section>
  );
}

function MarqueeRow({
  items,
  direction,
  className,
}: {
  items: Testimonial[];
  direction: 'left' | 'right';
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`flex ${className ?? ''}`}>
      <ul
        className={`flex shrink-0 gap-4 pb-2 pl-4 ${
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'
        }`}
      >
        {/* Rendered twice, back to back — the marquee keyframes translate by
            exactly -50%, so this duplication is what makes the loop
            invisible. The second copy is aria-hidden so a screen reader
            (and Tab order) only ever encounters each testimonial once. */}
        {[...items, ...items].map((testimonial, index) => (
          <TestimonialCard
            key={`${testimonial.id}-${index}`}
            testimonial={testimonial}
            hidden={index >= items.length}
          />
        ))}
      </ul>
    </div>
  );
}

function TestimonialCard({
  testimonial,
  hidden,
}: {
  testimonial: Testimonial;
  hidden: boolean;
}) {
  return (
    <li
      aria-hidden={hidden || undefined}
      className="w-[85vw] shrink-0 rounded-xl bg-surface-sunken p-6 sm:w-96 sm:p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <QuoteIcon size={22} className="text-accent/60" />
        {typeof testimonial.rating === 'number' && (
          <Rating value={testimonial.rating} size={13} showValue={false} />
        )}
      </div>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink">{testimonial.quote}</p>
      <div className="mt-5 flex items-center gap-2.5 border-t border-line/70 pt-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-on-accent">
          {testimonial.author.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{testimonial.author}</p>
          <p className="text-xs text-ink-subtle">{testimonial.role}</p>
        </div>
      </div>
    </li>
  );
}
