import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_CATEGORIES, FAQ_ENTRIES } from "@/lib/content/faq";
import { absoluteUrl, siteOpenGraphImage } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/lib/seo/jsonld";
import { Breadcrumb } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { FaqBrowser } from "@/components/faq/faq-browser";

export const revalidate = 86400;

const TITLE = "Frequently asked questions";
const DESCRIPTION =
  "Answers to real questions about our trackers, RFID wallets, smart backpack, EDC gear, shipping, returns and checkout security.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: {
    ...siteOpenGraphImage,
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/faq"),
  },
};

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: TITLE, url: "/faq" },
          ]),
          faqSchema(FAQ_ENTRIES),
        ]}
      />

      <div className="container-page">
        <div className="py-4">
          <Breadcrumb
            items={[{ href: "/", label: "Home" }, { label: TITLE }]}
          />
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-xl py-6 text-center sm:py-10">
          <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium tracking-wide text-accent uppercase">
            Help center
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl">Questions, answered</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
            Real answers about what our trackers actually support, how the gear
            holds up, and how orders, returns and checkout work here.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-ink-subtle">
            <span>{FAQ_ENTRIES.length} questions</span>
            <span
              aria-hidden="true"
              className="size-1 rounded-full bg-line-strong"
            />
            <span>{FAQ_CATEGORIES.length} categories</span>
            <span
              aria-hidden="true"
              className="size-1 rounded-full bg-line-strong"
            />
            <span>Answers within 1 working day</span>
          </div>
        </div>

        <div className="pb-14">
          <FaqBrowser categories={FAQ_CATEGORIES} />
        </div>

        {/* ── Contact CTA ──────────────────────────────────────────────── */}
        <section
          id="contact"
          aria-labelledby="faq-contact-heading"
          className="scroll-mt-24 pb-16"
        >
          <div className="mx-auto grid max-w-3xl overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-[1.3fr_1fr]">
            <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
              <h2 id="faq-contact-heading" className="text-xl">
                Still have a question?
              </h2>
              <p className="text-sm leading-relaxed text-ink-muted">
                We answer every message within one working day. Include your
                order number if it&rsquo;s about an order that&rsquo;s already
                placed — it lets us help you straight away.
              </p>
              <div className="mt-1 flex flex-wrap gap-3">
                <ButtonLink href="/pages/contact" className="rounded-full">
                  Contact us
                </ButtonLink>
                <ButtonLink
                  href="/account/orders"
                  variant="outline"
                  className="rounded-full"
                >
                  Find your order
                </ButtonLink>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-1 border-t border-line bg-surface-sunken p-6 sm:border-t-0 sm:border-l sm:p-8">
              <p className="mb-1 text-xs font-medium tracking-wide text-ink-subtle uppercase">
                Quick links
              </p>
              {[
                { href: "/pages/returns", label: "Returns policy" },
                { href: "/pages/shipping", label: "Shipping details" },
                { href: "/account/orders", label: "Track an order" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center justify-between gap-2 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  {link.label}
                  <ChevronRightIcon
                    size={15}
                    className="shrink-0 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
