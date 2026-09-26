import Image from "next/image";
import type { CSSProperties } from "react";
import type { CatalogFeatureHighlight, CatalogSpecVideo } from "@/types/catalog";
import { cn } from "@/lib/utils/cn";
import { PdpIcon } from "./pdp-icon";

/**
 * The persuasion half of the PDP: why this product, shown working, in the
 * shopper's life. Server components only — no client JS below the hero until
 * reviews. Every section renders nothing when its Shopify list is empty.
 */

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  align = "left",
  inverse = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string | null;
  align?: "left" | "center";
  inverse?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      <p className={cn("text-2xs font-semibold tracking-[0.2em] uppercase", inverse ? "text-accent-soft" : "text-accent")}>
        {eyebrow}
      </p>
      <h2 id={id} className="mt-2 text-2xl text-balance">
        {title}
      </h2>
      {intro && (
        <p className={cn("mt-3 text-base leading-relaxed text-pretty", inverse ? "text-ink-inverse/75" : "text-ink-muted")}>
          {intro}
        </p>
      )}
    </div>
  );
}

/* ── Key benefits strip ─────────────────────────────────────────────── */

export function ProductBenefits({ items }: { items: CatalogFeatureHighlight[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Key benefits" className="border-y border-line bg-surface">
      <ul className="container-page grid grid-cols-2 gap-x-6 gap-y-7 py-9 lg:grid-cols-4 lg:py-10">
        {items.map((item) => (
          <li key={item.label} className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <PdpIcon icon={item.icon} size={22} />
            </span>
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="mt-1 text-sm leading-snug text-ink-muted">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── Problem → solution ─────────────────────────────────────────────── */

export function ProblemSolution({ story }: { story: CatalogFeatureHighlight[] }) {
  const [problem, solution] = story;
  if (!problem || !solution) return null;
  return (
    <section aria-labelledby="story-heading" className="container-page py-14 lg:py-16">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="max-w-lg">
          <p className="text-2xs font-semibold tracking-[0.2em] text-ink-subtle uppercase">The problem</p>
          <h2 id="story-heading" className="mt-2 text-2xl text-balance">
            {problem.label}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-muted text-pretty">{problem.body}</p>

          <div className="my-7 h-px w-12 bg-line-strong" aria-hidden="true" />

          <p className="text-2xs font-semibold tracking-[0.2em] text-accent uppercase">The fix</p>
          <h3 className="mt-2 text-2xl text-balance">{solution.label}</h3>
          <p className="mt-3 text-base leading-relaxed text-ink text-pretty">{solution.body}</p>
        </div>
        {solution.image && (
          <div
            className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-surface-sunken"
            style={{ aspectRatio: naturalRatio(solution.image) }}
          >
            <Image
              src={solution.image.url}
              alt={solution.image.altText || solution.label}
              fill
              sizes="(min-width: 1024px) 28rem, 100vw"
              className="object-contain"
            />
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Demonstration (needs real footage) ─────────────────────────────── */

export function ProductDemo({ video, title }: { video: CatalogSpecVideo | null; title: string }) {
  if (!video) return null;
  return (
    <section aria-labelledby="demo-heading" className="bg-primary py-14 text-ink-inverse lg:py-16">
      <div className="container-page">
        <SectionHeading id="demo-heading" eyebrow="See it work" title={`${title}, in real use`} align="center" inverse />
        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl bg-black shadow-e4">
          <video
            className="aspect-video w-full object-cover [&:fullscreen]:object-contain [&:-webkit-full-screen]:object-contain"
            controls
            muted
            loop
            playsInline
            preload="none"
            poster={video.previewUrl ?? undefined}
          >
            {video.sources.map((source) => (
              <source key={source.url} src={source.url} type={source.mimeType} />
            ))}
          </video>
        </div>
      </div>
    </section>
  );
}

/* ── Feature breakdown (alternating) ────────────────────────────────── */

/** An image's own shape as a CSS aspect-ratio, so it's shown whole instead of cropped to a fixed box. */
function naturalRatio(image: { width: number | null; height: number | null }): string {
  return image.width && image.height ? `${image.width} / ${image.height}` : "1 / 1";
}

/**
 * One row per feature, image and text alternating sides. Each image keeps
 * its own shape — these are infographics (square and wide mixed), and
 * cropping them to one box cuts off their text and badges.
 */
export function ProductFeatures({ items }: { items: CatalogFeatureHighlight[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="features-heading" className="bg-surface py-14 lg:py-16">
      <div className="container-page">
        <SectionHeading id="features-heading" eyebrow="Why it works" title="What makes it different" />
        <div className="mx-auto mt-10 max-w-5xl space-y-10 lg:space-y-14">
          {items.map((item, index) => (
            <article key={item.label} className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl bg-surface-sunken",
                  item.video && "aspect-4/3",
                  !item.video && !item.image && "aspect-square",
                  index % 2 === 1 && "md:order-2",
                )}
                style={!item.video && item.image ? { aspectRatio: naturalRatio(item.image) } : undefined}
              >
                {item.video ? (
                  <video
                    className="size-full object-contain"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    poster={item.video.previewUrl ?? undefined}
                  >
                    {item.video.sources.map((s) => (
                      <source key={s.url} src={s.url} type={s.mimeType} />
                    ))}
                  </video>
                ) : item.image ? (
                  <Image
                    src={item.image.url}
                    alt={item.image.altText || item.label}
                    fill
                    sizes="(min-width: 1024px) 30rem, (min-width: 768px) 45vw, 100vw"
                    className="object-contain"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-accent">
                    <PdpIcon icon={item.icon} size={48} />
                  </div>
                )}
              </div>
              <div className="max-w-md">
                <span className="flex items-center gap-3 text-sm text-accent">
                  <span className="font-display tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  <span className="h-px w-8 bg-accent/40" aria-hidden="true" />
                  <PdpIcon icon={item.icon} size={18} />
                </span>
                <h3 className="mt-3 text-xl text-balance">{item.label}</h3>
                <p className="mt-2 text-base leading-relaxed text-ink-muted text-pretty">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How it works ───────────────────────────────────────────────────── */

export function HowItWorks({ steps }: { steps: CatalogFeatureHighlight[] }) {
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="how-heading" className="border-y border-line bg-surface-sunken/50 py-14 lg:py-16">
      <div className="container-page">
        <SectionHeading
          id="how-heading"
          eyebrow="How it works"
          title={`${steps.length} steps, no learning curve`}
          align="center"
        />
        {/* All steps in one row from md up, however many there are. */}
        <ol
          className="relative mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[repeat(var(--steps),minmax(0,1fr))]"
          style={{ "--steps": steps.length } as CSSProperties}
        >
          {/* Connector behind the step markers — desktop only. */}
          <span
            aria-hidden="true"
            className="absolute top-5 hidden h-px bg-line-strong md:block"
            style={{ left: `${50 / steps.length}%`, right: `${50 / steps.length}%` }}
          />
          {steps.map((step, index) => (
            <li key={step.label} className="relative flex flex-col items-center text-center">
              <span className="relative grid size-10 place-items-center rounded-full border border-line-strong bg-surface-raised text-accent">
                <PdpIcon icon={step.icon} size={18} />
              </span>
              <p className="mt-3 font-display text-xs tabular-nums text-ink-subtle">
                Step {index + 1}
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-ink">{step.label}</h3>
              <p className="mt-1.5 max-w-56 text-sm leading-relaxed text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Use cases ──────────────────────────────────────────────────────── */

export function UseCases({ items }: { items: CatalogFeatureHighlight[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="uses-heading" className="container-page py-14 lg:py-16">
      <SectionHeading id="uses-heading" eyebrow="Made for your routine" title="Where it fits in your day" />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.label} className="overflow-hidden rounded-xl border border-line bg-surface-raised">
            {item.image && (
              <div className="relative aspect-4/3 bg-surface-sunken">
                <Image src={item.image.url} alt={item.image.altText || item.label} fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
              </div>
            )}
            {/* Icon beside the text on phones (compact list), above it from sm. */}
            <div className="flex gap-3 p-4 sm:block">
              {!item.image && (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent sm:mb-3">
                  <PdpIcon icon={item.icon} size={18} />
                </span>
              )}
              <div>
                <h3 className="text-base font-semibold">{item.label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted sm:mt-2">{item.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
