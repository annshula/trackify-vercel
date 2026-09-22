import { testimonials, type Testimonial } from "@/lib/content/testimonials";
import { SectionHeading } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";
import {
  BookmarkIcon,
  CommentIcon,
  FacebookIcon,
  HeartIcon,
  InstagramIcon,
  ShareIcon,
  ThumbsUpIcon,
  VerifiedIcon,
} from "@/components/ui/icons";

/**
 * Two-row marquee: row one drifts right-to-left, row two drifts the
 * opposite way, so they read as counter-rotating rather than a single
 * mechanical strip. Pure CSS animation (see the tf-marquee-* utilities in
 * globals.css) — no JS driving the motion, so it never fights hydration and
 * costs nothing for a crawler, which sees every card in the initial HTML
 * either way (the "duplicate" half is `aria-hidden`, not hidden content).
 *
 * Splits the list into two rows by parity (even/odd index) rather than a
 * straight first-half/second-half slice. The data file orders the entries so
 * that lands every Instagram card on the top row and every Facebook card on
 * the bottom, keeping the two chromes out of the same row.
 */
export function Testimonials() {
  if (testimonials.length === 0) return null;

  const rowA = testimonials.filter((_, index) => index % 2 === 0);
  const rowB = testimonials.filter((_, index) => index % 2 === 1);

  return (
    <section
      className="overflow-hidden py-14"
      aria-labelledby="testimonials-heading"
    >
      <div className="container-page">
        <SectionHeading
          eyebrow="Word of mouth"
          title="What people are saying"
          description="Messages customers sent us directly — Canada, the United States, Australia and the UK. Shown as they arrived."
          align="center"
          className="mb-10"
        />
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
  direction: "left" | "right";
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`flex ${className ?? ""}`}>
      <ul
        className={`flex shrink-0 gap-4 pb-2 pl-4 ${
          direction === "left"
            ? "animate-marquee-left"
            : "animate-marquee-right"
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

type CardProps = {
  testimonial: Testimonial;
  hidden: boolean;
};

/**
 * Shared shell — the platform below supplies its own padding.
 *
 * Radius stays at `rounded-lg` (16px) on purpose: the theme's larger steps
 * (xl 24 / 2xl 32px) read as a pill at this card width, and a screenshot of
 * platform UI has the tighter corner of a cropped image, not a soft panel.
 */
const CARD_SHELL =
  "flex w-[85vw] shrink-0 flex-col rounded-lg border border-line bg-surface shadow-e1 sm:w-96";

/**
 * Picks the platform chrome. The two are genuinely different designs — an
 * Instagram post and a Facebook comment do not share a layout — so this is a
 * branch, not a shared component with variants.
 */
function TestimonialCard({ testimonial, hidden }: CardProps) {
  return testimonial.platform === "instagram" ? (
    <InstagramCard testimonial={testimonial} hidden={hidden} />
  ) : (
    <FacebookCard testimonial={testimonial} hidden={hidden} />
  );
}

/**
 * Instagram post: story-ring avatar, name + verified tick, action row, then
 * the caption with the handle in bold, the way Instagram sets it.
 *
 * The action row and its icons are chrome, not controls — they are
 * `aria-hidden` so a screen reader is not offered a heart button that does
 * nothing. Same for the Facebook card's Like/Reply/Share row.
 */
function InstagramCard({ testimonial, hidden }: CardProps) {
  return (
    <li
      aria-hidden={hidden || undefined}
      className={cn(CARD_SHELL, "overflow-hidden")}
    >
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)] p-0.5">
          <span className="grid size-full place-items-center rounded-full border-2 border-surface bg-surface-sunken text-xs font-semibold text-ink-muted">
            {testimonial.name.charAt(0)}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold">
              {testimonial.name}
            </span>
            <VerifiedIcon size={13} className="shrink-0" />
          </span>
          <span className="block truncate text-2xs text-ink-subtle">
            {testimonial.location}
          </span>
        </span>
        <InstagramIcon size={18} className="shrink-0 text-ink" />
      </div>

      <div
        className="flex items-center gap-3.5 px-3.5 pt-3 text-ink"
        aria-hidden="true"
      >
        <HeartIcon size={21} />
        <CommentIcon size={20} />
        <ShareIcon size={19} />
        <BookmarkIcon size={19} className="ml-auto" />
      </div>

      <p className="px-3.5 pt-2.5 text-sm leading-relaxed text-ink">
        <span className="font-semibold">{testimonial.handle}</span>{" "}
        {testimonial.quote}
      </p>

      <p className="mt-auto flex items-center gap-1.5 px-3.5 pt-2.5 pb-3.5 text-2xs text-ink-subtle">
        <span>{testimonial.postedAt}</span>
        <span aria-hidden="true">·</span>
        <span>{testimonial.role}</span>
      </p>
    </li>
  );
}

/**
 * Facebook comment: avatar beside a grey speech bubble, the reaction pill
 * tucked under its corner, then the Like · Reply · Share line. The bubble's
 * square top-left corner is Facebook's own tell, so it is deliberate.
 */
function FacebookCard({ testimonial, hidden }: CardProps) {
  return (
    <li aria-hidden={hidden || undefined} className={cn(CARD_SHELL, "p-3.5")}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-sunken text-xs font-semibold text-ink-muted">
          {testimonial.name.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold">
              {testimonial.name}
            </span>
            <VerifiedIcon size={13} className="shrink-0" />
          </span>
          <span className="block truncate text-2xs text-ink-subtle">
            {testimonial.location}
          </span>
        </span>
        <FacebookIcon size={18} className="shrink-0" />
      </div>

      <div className="relative mt-2.5">
        <div className="rounded-lg rounded-tl-xs bg-surface-sunken px-3.5 py-2.5">
          <p className="text-sm leading-relaxed text-ink">
            <span className="font-semibold">{testimonial.handle}</span>{" "}
            {testimonial.quote}
          </p>
        </div>
        <span
          className="absolute -bottom-2.5 left-3 flex items-center"
          aria-hidden="true"
        >
          <span className="grid size-4.5 place-items-center rounded-full bg-[#1877f2] text-white ring-2 ring-surface">
            <ThumbsUpIcon size={11} strokeWidth={2.6} />
          </span>
          <span className="-ml-1 grid size-4.5 place-items-center rounded-full bg-[#f3425f] text-white ring-2 ring-surface">
            <HeartIcon size={10} filled strokeWidth={2.6} />
          </span>
        </span>
      </div>

      <div
        className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-ink-subtle"
        aria-hidden="true"
      >
        <span>Like</span>
        <span>·</span>
        <span>Reply</span>
        <span>·</span>
        <span>Share</span>
        <span className="ml-auto pl-1.5 font-normal">
          {testimonial.postedAt}
        </span>
      </div>

      <p className="mt-auto pt-2.5 text-2xs text-ink-subtle">
        {testimonial.role}
      </p>
    </li>
  );
}
