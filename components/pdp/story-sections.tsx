import Image from "next/image";
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
      <h2 id={id} className="mt-3 text-3xl text-balance">
        {title}
      </h2>
      {intro && (
        <p className={cn("mt-4 text-lg leading-relaxed text-pretty", inverse ? "text-ink-inverse/75" : "text-ink-muted")}>
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
    <section aria-labelledby="story-heading" className="container-page py-20 lg:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-2xs font-semibold tracking-[0.2em] text-ink-subtle uppercase">The problem</p>
          <h2 id="story-heading" className="mt-3 text-3xl text-balance">
            {problem.label}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted text-pretty">{problem.body}</p>

          <div className="my-10 h-px w-16 bg-line-strong" aria-hidden="true" />

          <p className="text-2xs font-semibold tracking-[0.2em] text-accent uppercase">The fix</p>
          <h3 className="mt-3 text-3xl text-balance">{solution.label}</h3>
          <p className="mt-4 text-lg leading-relaxed text-ink text-pretty">{solution.body}</p>
        </div>
        {solution.image && (
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-sunken shadow-e2">
            <Image
              src={solution.image.url}
              alt={solution.image.altText || solution.label}
              fill
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="object-cover"
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
    <section aria-labelledby="demo-heading" className="bg-primary py-20 text-ink-inverse lg:py-28">
      <div className="container-page">
        <SectionHeading id="demo-heading" eyebrow="See it work" title={`${title}, in real use`} align="center" inverse />
        <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl bg-black shadow-e4">
          <video
            className="aspect-video w-full object-cover"
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

export function ProductFeatures({ items }: { items: CatalogFeatureHighlight[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="features-heading" className="bg-surface py-20 lg:py-28">
      <div className="container-page">
        <SectionHeading id="features-heading" eyebrow="Why it works" title="What makes it different" />
        <div className="mt-14 space-y-16 lg:mt-20 lg:space-y-24">
          {items.map((item, index) => (
            <article key={item.label} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-20">
              <div className={cn("relative aspect-square overflow-hidden rounded-2xl bg-surface-sunken", index % 2 === 1 && "lg:order-2")}>
                {item.video ? (
                  <video
                    className="size-full object-cover"
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
                    sizes="(min-width: 1024px) 44vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-accent">
                    <PdpIcon icon={item.icon} size={64} />
                  </div>
                )}
              </div>
              <div className="max-w-lg">
                <span className="flex items-center gap-3 text-sm text-accent">
                  <span className="font-display tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  <span className="h-px w-8 bg-accent/40" aria-hidden="true" />
                  <PdpIcon icon={item.icon} size={20} />
                </span>
                <h3 className="mt-4 text-2xl text-balance lg:text-3xl">{item.label}</h3>
                <p className="mt-4 text-lg leading-relaxed text-ink-muted text-pretty">{item.body}</p>
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
    <section aria-labelledby="how-heading" className="bg-primary py-20 text-ink-inverse lg:py-28">
      <div className="container-page">
        <SectionHeading
          id="how-heading"
          eyebrow="How it works"
          title={`${steps.length} steps, no learning curve`}
          align="center"
          inverse
        />
        <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Connector behind the step markers — desktop only. */}
          <span aria-hidden="true" className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-ink-inverse/20 md:block" />
          {steps.map((step, index) => (
            <li key={step.label} className="relative flex flex-col items-center text-center">
              <span className="relative grid size-14 place-items-center rounded-full border border-ink-inverse/25 bg-primary text-accent-soft">
                <PdpIcon icon={step.icon} size={24} />
              </span>
              <p className="mt-5 font-display text-sm tabular-nums text-ink-inverse/60">
                Step {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-1 text-2xl">{step.label}</h3>
              <p className="mt-3 max-w-xs leading-relaxed text-ink-inverse/75">{step.body}</p>
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
    <section aria-labelledby="uses-heading" className="container-page py-20 lg:py-28">
      <SectionHeading id="uses-heading" eyebrow="Made for your routine" title="Where it fits in your day" />
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.label} className="overflow-hidden rounded-xl border border-line bg-surface-raised">
            {item.image && (
              <div className="relative aspect-[4/3] bg-surface-sunken">
                <Image src={item.image.url} alt={item.image.altText || item.label} fill sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw" className="object-cover" />
              </div>
            )}
            <div className="p-6">
              {!item.image && (
                <span className="mb-5 grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
                  <PdpIcon icon={item.icon} size={22} />
                </span>
              )}
              <h3 className="text-lg">{item.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
