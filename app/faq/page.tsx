import type { Metadata } from "next";
import Link from "next/link";
import { FAQ_CATEGORIES, FAQ_ENTRIES } from "@/lib/content/faq";
import { absoluteUrl } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/lib/seo/jsonld";
import { Breadcrumb } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
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
          <Breadcrumb items={[{ href: "/", label: "Home" }, { label: TITLE }]} />
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-2xl py-8 text-center sm:py-12">
          <h1 className="text-4xl sm:text-5xl">Questions, answered</h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
            Real answers about what our trackers actually support, how the
            gear holds up, and how orders, returns and checkout work here —
            not boilerplate copied from somewhere else.
          </p>
        </div>

        <div className="pb-16">
          <FaqBrowser categories={FAQ_CATEGORIES} />
        </div>

        {/* ── Contact CTA ──────────────────────────────────────────────── */}
        <section
          id="contact"
          aria-labelledby="faq-contact-heading"
          className="scroll-mt-24 pb-16"
        >
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-8 text-center sm:p-10">
            <h2 id="faq-contact-heading" className="text-2xl">
              Still have a question?
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-ink-muted">
              We answer every message within one working day. Include your
              order number if it&rsquo;s about an order that&rsquo;s already
              placed — it lets us help you straight away.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/pages/contact" size="lg" className="rounded-full">
                Contact us
              </ButtonLink>
              <ButtonLink
                href="/account/orders"
                variant="outline"
                size="lg"
                className="rounded-full"
              >
                Find your order
              </ButtonLink>
            </div>
          </div>
        </section>

        <p className="pb-16 text-center text-xs text-ink-subtle">
          Looking for our full{" "}
          <Link href="/pages/returns" className="underline underline-offset-4">
            returns policy
          </Link>{" "}
          or{" "}
          <Link href="/pages/shipping" className="underline underline-offset-4">
            shipping details
          </Link>
          ?
        </p>
      </div>
    </>
  );
}
