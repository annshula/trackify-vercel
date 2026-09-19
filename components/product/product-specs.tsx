import type { ComponentType } from 'react';
import Image from 'next/image';
import type { CatalogFeatureHighlight, CatalogProduct, CatalogProductSpec } from '@/types/catalog';
import { imageAlt, shopifyImageUrl } from '@/lib/utils/image';
import { GemIcon, RulerIcon, TruckIcon } from '@/components/ui/icons';

/**
 * The product story: feature highlights + rich specs, from the
 * `custom.feature_highlights` and `custom.specs` metaobject lists
 * (see lib/catalog/normalize.ts).
 *
 * This owns the visual narrative for products that have the structured data.
 * The Shopify `descriptionHtml` stays deliberately plain prose for those
 * products — two competing rich layouts for the same content is what made
 * this page read as unfinished, and typed metaobjects win over inline-styled
 * HTML in a text field because only these can use the real design tokens and
 * stay responsive.
 *
 * Rendered outside `container-page` by the product page so each spec band can
 * span the full viewport: one claim, one large image, room to breathe.
 * Renders nothing when neither field is set — most of the catalog still uses
 * plain `specs.*` metafields, and ProductDetails' Specifications tab remains
 * the fallback there.
 */
export function ProductSpecs({ product }: { product: CatalogProduct }) {
  const { featureHighlights, specs } = product;
  if (featureHighlights.length === 0 && specs.length === 0) return null;

  return (
    <section aria-labelledby="specs-heading" className="mt-16 lg:mt-24">
      <h2 id="specs-heading" className="sr-only">
        Highlights and specifications
      </h2>

      {featureHighlights.length > 0 && (
        <div className="border-y border-line bg-surface">
          <div className="container-page grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {featureHighlights.map((feature) => (
              <FeatureCard key={feature.label} feature={feature} />
            ))}
          </div>
        </div>
      )}

      {specs.map((spec, index) => (
        <SpecSection key={spec.label} spec={spec} index={index} />
      ))}
    </section>
  );
}

const ICON_MAP: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  stone: GemIcon,
  fit: RulerIcon,
  ship: TruckIcon,
};

/**
 * A quiet supporting detail, not a headline moment — sits directly under the
 * buy box as a hairline-divided band. Deliberately restrained: two of these
 * competing with the spec sections below would flatten the page's hierarchy.
 */
function FeatureCard({ feature }: { feature: CatalogFeatureHighlight }) {
  const Icon = (feature.icon && ICON_MAP[feature.icon]) || null;

  return (
    <div className="scroll-reveal flex items-start gap-4 py-8 sm:px-8 sm:py-10 sm:first:pl-0 sm:last:pr-0">
      {feature.image ? (
        <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
          <Image
            src={shopifyImageUrl(feature.image.url, { width: 96, height: 96 })}
            alt={imageAlt(feature.image, feature.label)}
            fill
            sizes="48px"
            className="object-cover"
          />
        </span>
      ) : (
        Icon && (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon size={22} />
          </span>
        )
      )}
      <div className="min-w-0">
        <p className="font-display text-lg leading-snug font-medium text-ink">{feature.label}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
      </div>
    </div>
  );
}

/**
 * One spec, one full-bleed band.
 *
 * The two halves are each centered in their own column rather than both
 * hugging the left edge, and the image is a real visual anchor rather than a
 * thumbnail — that combination is what makes this read as a designed section
 * instead of a list row. Tint and image side alternate purely for rhythm down
 * a long spec list.
 */
function SpecSection({ spec, index }: { spec: CatalogProductSpec; index: number }) {
  const reverse = index % 2 === 1;

  // A spec with neither image nor video centers as a single measured column
  // instead of leaving a dead half-width gap where the visual would have been.
  if (!spec.image && !spec.video) {
    return (
      <article className={reverse ? 'bg-surface-sunken' : 'bg-canvas'}>
        <div className="container-page py-10 sm:py-12">
          <div className="scroll-reveal mx-auto max-w-2xl text-center">
            <p className="flex items-center justify-center gap-2.5 text-2xs font-semibold tracking-[0.18em] text-ink-subtle uppercase">
              <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
              {spec.label}
            </p>
            <p className="mt-3 font-display text-xl leading-[1.2] tracking-tight text-balance text-ink lg:text-2xl">
              {spec.value}
            </p>
            {spec.description && (
              <p className="mt-3 text-sm leading-relaxed text-pretty text-ink-muted">
                {spec.description}
              </p>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={reverse ? 'bg-surface-sunken' : 'bg-canvas'}>
      <div className="container-page grid items-center gap-8 py-12 sm:py-14 lg:grid-cols-2 lg:gap-16 lg:py-16">
        <div className={`scroll-reveal ${reverse ? 'lg:order-2' : ''}`}>
          <p className="flex items-center gap-2.5 text-2xs font-semibold tracking-[0.18em] text-ink-subtle uppercase">
            <span className="tabular-nums">{String(index + 1).padStart(2, '0')}</span>
            {spec.label}
          </p>

          <p className="mt-3 font-display text-2xl leading-[1.15] tracking-tight text-balance text-ink lg:text-3xl">
            {spec.value}
          </p>

          {spec.description && (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              {spec.description}
            </p>
          )}
        </div>

        {/* Capped rather than filling the column: at full half-width the
            image dominated the section and forced its height up, which is
            what made these bands read as oversized. */}
        <div
          className={`scroll-reveal group relative aspect-4/3 w-full max-w-sm overflow-hidden rounded-xl bg-surface lg:aspect-square ${
            reverse ? 'lg:order-1 lg:mr-auto' : 'lg:ml-auto'
          }`}
        >
          {spec.video ? (
            // Muted, looping and inline: this is supporting imagery for a
            // spec, not a feature presentation, so it should behave like a
            // moving photograph rather than demand playback controls.
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={spec.video.previewUrl ?? undefined}
              aria-label={`${spec.label}: ${spec.value}`}
              className="size-full object-cover"
            >
              {spec.video.sources.map((source) => (
                <source key={source.url} src={source.url} type={source.mimeType} />
              ))}
            </video>
          ) : (
            spec.image && (
              <Image
                src={shopifyImageUrl(spec.image.url, { width: 768, height: 768 })}
                alt={imageAlt(spec.image, spec.label)}
                fill
                sizes="(min-width: 1024px) 384px, 100vw"
                className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
              />
            )
          )}
        </div>
      </div>
    </article>
  );
}
