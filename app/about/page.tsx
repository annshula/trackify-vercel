import type { Metadata } from "next";

import { productRepository } from "@/lib/catalog";
import { productRating } from "@/lib/catalog/selectors";
import { absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbSchema } from "@/lib/seo/jsonld";
import { ButtonLink } from "@/components/ui/button";
import {
  PackageIcon,
  RefreshIcon,
  ShieldIcon,
  StarIcon,
} from "@/components/ui/icons";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About",
  description: "Security and convenience in every carry — the Trackify story.",
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    title: "About · Trackify",
    description:
      "Security and convenience in every carry — the Trackify story.",
    url: absoluteUrl("/about"),
  },
};

const STORY = [
  "At Trackify, we believe that security and convenience should go hand in hand, which is why we develop innovative tracking solutions that integrate effortlessly into daily life. Our journey began with a simple yet significant idea—to eliminate the worry of losing essential belongings. We understand that in today’s fast-paced world, people need reliable, intuitive, and stylish solutions that provide peace of mind. That’s why we meticulously design products that merge advanced tracking technology with sleek, minimalistic aesthetics, ensuring that they are not only functional but also visually appealing. From smart wallet trackers to RFID-enabled accessories, every Trackify product is engineered to enhance organization, prevent loss, and offer an extra layer of security without adding bulk or complexity.",
  "We take pride in our dedication to quality, crafting each item with precision and using the highest-grade materials to ensure durability. Our products are tested rigorously to withstand the demands of daily use, whether you’re navigating your workday, traveling across the globe, or simply running errands. We prioritize user experience, ensuring that every feature—from GPS tracking and Bluetooth connectivity to geofencing and real-time alerts—is designed for ease of use and reliability. Our goal is to provide customers with a seamless and worry-free experience, allowing them to focus on what matters most without the constant fear of misplacing their essentials.",
  "At the heart of Trackify lies a deep commitment to innovation and continuous improvement. We keep a close eye on technological advancements, ensuring our products evolve with the ever-changing needs of modern consumers. As a brand, we also acknowledge our responsibility toward sustainability and ethical production. That’s why we strive to reduce our environmental impact by using eco-friendly materials and adopting sustainable packaging solutions whenever possible. We envision a future where technology not only makes life simpler but also contributes to a more sustainable planet.",
  "Our commitment goes beyond just providing smart tracking solutions; it’s about building trust, fostering innovation, and ensuring that our customers feel empowered every step of the way. Whether you’re looking for a better way to secure your valuables, organize your daily essentials, or embrace a tech-forward lifestyle, Trackify is here to offer intelligent solutions that redefine everyday convenience. With Trackify, you don’t just track—you take control of your life.",
];

const VALUES = [
  {
    icon: ShieldIcon,
    title: "Security, without the bulk",
    body: "Every product adds an extra layer of protection to your everyday carry — no added bulk, no added complexity.",
  },
  {
    icon: PackageIcon,
    title: "Built to last",
    body: "Precision-crafted from the highest-grade materials and tested rigorously to withstand the demands of daily use.",
  },
  {
    icon: StarIcon,
    title: "Thoughtfully engineered",
    body: "GPS tracking, Bluetooth connectivity, geofencing and real-time alerts — every feature designed for ease and reliability.",
  },
  {
    icon: RefreshIcon,
    title: "Responsible by design",
    body: "We reduce our footprint with eco-friendly materials and sustainable packaging wherever possible.",
  },
];

export default async function AboutPage() {
  const [products, collections] = await Promise.all([
    productRepository.getAllProducts().catch(() => []),
    productRepository.getAllCollections().catch(() => []),
  ]);

  const ratings = products
    .map(productRating)
    .filter(
      (rating): rating is NonNullable<typeof rating> =>
        rating !== null && rating.count > 0,
    );
  const averageRating = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating.value, 0) / ratings.length
    : null;

  const stats = [
    { value: String(products.length), label: "Smart products" },
    {
      value: String(collections.filter((c) => c.productIds.length > 0).length),
      label: "Curated collections",
    },
    {
      value: averageRating ? `${averageRating.toFixed(1)}★` : "—",
      label: "Average rating",
    },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ])}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-b from-accent-soft/70 via-transparent to-transparent"
          aria-hidden="true"
        />
        <div className="container-page relative">
          <div className="mx-auto max-w-3xl py-20 text-center sm:py-28">
            <p className="text-2xs font-semibold tracking-[0.24em] text-accent uppercase">
              About Trackify
            </p>
            <h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-5xl">
              Security and convenience, in every carry.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              Trackify builds smart tracking products that merge advanced
              technology with sleek, minimal design — so you never lose what
              matters.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/collections" variant="primary" size="lg">
                Shop the edit
              </ButtonLink>
              <ButtonLink href="/pages/contact" variant="outline" size="lg">
                Contact us
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <section className="container-page">
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-e1 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface px-6 py-9 text-center">
              <dd className="text-3xl font-medium tabular-nums sm:text-4xl">
                {stat.value}
              </dd>
              <dt className="mt-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Story ─────────────────────────────────────────────────────── */}
      <section className="container-page py-20 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <p className="text-2xs font-semibold tracking-[0.24em] text-accent uppercase">
            Our story
          </p>
          <h2 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">
            Why we make trackers at all.
          </h2>
          <div className="mt-9 space-y-6">
            <p className="text-lg leading-relaxed text-ink">{STORY[0]}</p>
            {STORY.slice(1).map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-ink-muted">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface-sunken/60 py-20 sm:py-28">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-2xs font-semibold tracking-[0.24em] text-accent uppercase">
              What we stand for
            </p>
            <h2 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">
              The principles behind every product.
            </h2>
          </div>

          <ul className="mt-14 grid gap-5 sm:grid-cols-2">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <li key={value.title}>
                  <div className="group h-full rounded-2xl border border-line bg-surface p-7 shadow-e1 transition-shadow hover:shadow-e2">
                    <div className="grid size-12 place-items-center rounded-xl bg-accent-soft text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent">
                      <Icon size={22} />
                    </div>
                    <h3 className="mt-6 text-lg font-medium">{value.title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
                      {value.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="container-page py-20 sm:py-28">
        <div className="relative overflow-hidden rounded-2xl bg-ink px-6 py-16 text-center sm:py-20">
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-medium tracking-tight text-ink-inverse sm:text-4xl">
              With Trackify, you don’t just track — you take control of your
              life.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ink-inverse/70 sm:text-base">
              Explore the edit and find the piece that keeps your essentials
              close.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/collections" variant="accent" size="lg">
                Shop the edit
              </ButtonLink>
              <ButtonLink
                href="/pages/faq"
                variant="outline"
                size="lg"
                className="border-ink-inverse/30 text-ink-inverse hover:border-ink-inverse/50 hover:bg-ink-inverse/10"
              >
                Read the FAQ
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
