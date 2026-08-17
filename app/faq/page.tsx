import type { Metadata } from "next";
import { FAQ_CATEGORIES, FAQ_ENTRIES } from "@/lib/content/faq";
import { absoluteUrl, siteOpenGraphImage } from "@/lib/seo/metadata";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/lib/seo/jsonld";
import { FaqExperience } from "@/components/faq/faq-experience";

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
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
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

      <FaqExperience categories={FAQ_CATEGORIES} title={TITLE} />
    </>
  );
}
