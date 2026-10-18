import { LoadingImage } from "./loading-image";
import type { CatalogFeatureHighlight } from "@/types/catalog";
import { cn } from "@/lib/utils/cn";
import { PdpIcon } from "./pdp-icon";
import { SectionHeading } from "./section-heading";
import { VideoShowcase, type ShowcaseVideo } from "./video-showcase";

/**
 * The persuasion half of the PDP, in a banded rhythm: full-width bands
 * alternate with rounded, tinted panels (`px-2 sm:px-3` gutter around a
 * `rounded-media` block). Every section renders nothing when its Shopify list
 * is empty — nothing is defaulted or invented.
 */

/** An image's own shape as a CSS aspect-ratio, so it is shown whole instead of cropped to a fixed box. */
function naturalRatio(image: { width: number | null; height: number | null }): string {
  return image.width && image.height ? `${image.width} / ${image.height}` : "1 / 1";
}

/* ── See it in action ───────────────────────────────────────────────── */

type VideoLike = {
  sources: { url: string; mimeType: string }[];
  previewUrl: string | null;
  altText?: string | null;
};

const playableSource = (video: VideoLike) =>
  video.sources.find((s) => s.mimeType === "video/mp4") ?? video.sources[0];

/**
 * Real footage only: the demo video (`custom.demo_video`) and customer clips
 * (`custom.ugc_media`) — a full-bleed, auto-drifting rail of portrait tiles.
 */
export function ProductVideos({
  videos,
  title,
}: {
  videos: VideoLike[];
  title: string;
}) {
  const clips: ShowcaseVideo[] = videos.flatMap((video, index) => {
    const source = playableSource(video);
    if (!source) return [];
    return [
      {
        src: source.url,
        poster: video.previewUrl ?? undefined,
        alt: video.altText ?? `${title} video ${index + 1}`,
      },
    ];
  });
  if (clips.length === 0) return null;

  return (
    <section className="py-12 lg:py-16" aria-labelledby="videos">
      <div className="container-page">
        <SectionHeading
          eyebrow="Real use"
          title="See it in action."
          id="videos"
          intro={`${title}, in real use.`}
        />
      </div>
      {/* Full-bleed: the row runs edge to edge of the viewport, past
          container-page's max width, so the marquee has real room to drift. */}
      <VideoShowcase videos={clips} className="mt-8 px-2 sm:px-3" />
    </section>
  );
}

/* ── Feature highlights (alternating image layout) ─────────────────── */

export function ProductFeatures({ items }: { items: CatalogFeatureHighlight[] }) {
  if (items.length === 0) return null;
  return (
    <section className="px-2 sm:px-3" aria-labelledby="highlights">
      <div className="rounded-media bg-ivory py-12 lg:py-16">
        <div className="container-page">
          <SectionHeading eyebrow="The details" title="What makes it different." id="highlights" />
        </div>
        <div className="container-page mt-8 flex flex-col gap-8 lg:gap-12">
          {items.map((item, i) => (
            <div
              key={item.label}
              className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12"
            >
              <div className={cn(i % 2 === 0 && "lg:order-2")}>
                <p className="font-serif text-heading-2 font-light">{item.label}</p>
                <p className="mt-2 text-body-sm text-ink-soft">{item.body}</p>
              </div>
              {item.video ? (
                <div
                  className={cn(
                    "relative aspect-4/3 overflow-hidden rounded-media bg-ink",
                    i % 2 === 0 && "lg:order-1",
                  )}
                >
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
                </div>
              ) : item.image ? (
                <div
                  className={cn(
                    "relative aspect-4/3 overflow-hidden rounded-media",
                    i % 2 === 0 && "lg:order-1",
                  )}
                >
                  <LoadingImage
                    src={item.image.url}
                    alt={item.image.altText || item.label}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-contain"
                  />
                </div>
              ) : null}
            </div>
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
    <section className="py-12 lg:py-16" aria-labelledby="how-to-use">
      <div className="container-page">
        <SectionHeading
          eyebrow="How it works"
          title={`${steps.length} ${steps.length === 1 ? "step" : "steps"}, no learning curve.`}
          id="how-to-use"
        />
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.label} className="rounded-media bg-porcelain p-5 shadow-soft lg:p-6">
              <p
                className="grid size-10 place-items-center rounded-control bg-clay-50 font-serif text-body-lg text-clay-600 tabular-nums"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-5 font-serif text-heading-3">
                <span className="sr-only">Step {i + 1}: </span>
                {step.label}
              </h3>
              <p className="mt-1.5 text-body-sm text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ── Key benefits ───────────────────────────────────────────────────── */

export function ProductBenefits({ items }: { items: CatalogFeatureHighlight[] }) {
  if (items.length === 0) return null;
  return (
    <section className="px-2 sm:px-3" aria-labelledby="benefits">
      <div className="rounded-media bg-sage-100 py-12 lg:py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[5fr_7fr] lg:gap-16">
          <SectionHeading
            eyebrow="Why you'll like it"
            title="Key benefits."
            id="benefits"
            intro="What this product does for you, in plain terms."
          />
          <dl className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.label}
                className="flex gap-4 rounded-card bg-porcelain/90 p-4 shadow-soft sm:p-5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-control bg-sage-100 text-sage-600">
                  <PdpIcon icon={item.icon} size={18} />
                </span>
                <div>
                  <dt className="font-serif text-heading-3">{item.label}</dt>
                  <dd className="mt-1 text-ink-soft">{item.body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* ── Problem → solution ─────────────────────────────────────────────── */

export function ProblemSolution({ story }: { story: CatalogFeatureHighlight[] }) {
  const [problem, solution] = story;
  if (!problem || !solution) return null;
  return (
    <section className="py-12 lg:py-16" aria-labelledby="story-heading">
      <div className="container-page">
        <SectionHeading
          eyebrow="The story"
          title="The problem, and the fix."
          id="story-heading"
        />
        <div className="mt-8 grid gap-3 lg:grid-cols-2">
          <div className="rounded-media bg-clay-100 p-6 lg:p-7">
            <p className="eyebrow">The problem</p>
            <h3 className="mt-3 font-serif text-heading-3">{problem.label}</h3>
            <p className="mt-2 text-body-sm text-ink-soft">{problem.body}</p>
          </div>
          <div className="rounded-media bg-porcelain p-6 shadow-soft lg:p-7">
            <p className="eyebrow">The fix</p>
            <h3 className="mt-3 font-serif text-heading-3">{solution.label}</h3>
            <p className="mt-2 text-body-sm text-ink-soft">{solution.body}</p>
            {solution.image && (
              <div
                className="relative mt-5 overflow-hidden rounded-card"
                style={{ aspectRatio: naturalRatio(solution.image) }}
              >
                <LoadingImage
                  src={solution.image.url}
                  alt={solution.image.altText || solution.label}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Use cases ──────────────────────────────────────────────────────── */

export function UseCases({ items }: { items: CatalogFeatureHighlight[] }) {
  if (items.length === 0) return null;
  return (
    <section className="py-12 lg:py-16" aria-labelledby="uses-heading">
      <div className="container-page">
        <SectionHeading
          eyebrow="Made for your routine"
          title="Where it fits in your day."
          id="uses-heading"
        />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li
              key={item.label}
              className="overflow-hidden rounded-media bg-porcelain shadow-soft"
            >
              {item.image && (
                <div className="relative aspect-4/3">
                  <LoadingImage
                    src={item.image.url}
                    alt={item.image.altText || item.label}
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-5 lg:p-6">
                {!item.image && (
                  <span className="mb-4 grid size-10 place-items-center rounded-control bg-sage-100 text-sage-600">
                    <PdpIcon icon={item.icon} size={18} />
                  </span>
                )}
                <h3 className="font-serif text-heading-3">{item.label}</h3>
                <p className="mt-2 text-body-sm text-ink-soft">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
